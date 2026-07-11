import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { getPayment, mapMercadoPagoStatus } from "@/lib/mercadopago/server";

const supabase = () => getSupabaseServiceRole();

export const ORDER_SELECT = `
  id,
  cart_id,
  customer_id,
  order_number,
  status,
  payment_status,
  currency_code,
  items_subtotal_cents,
  shipping_cents,
  discount_cents,
  total_cents,
  shipping_address,
  billing_address,
  notes,
  mercado_pago_preference_id,
  mercado_pago_payment_id,
  placed_at,
  fulfilled_at,
  cancelled_at,
  items:order_items (
    id,
    name,
    variant_title,
    quantity,
    unit_price_cents,
    subtotal_cents,
    currency_code
  )
`.trim();

export function serializeOrderRecord(order) {
  if (!order) return null;

  return {
    id: order.id,
    number: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    currency: order.currency_code ?? "ARS",
    subtotal: (order.items_subtotal_cents ?? 0) / 100,
    shipping: (order.shipping_cents ?? 0) / 100,
    discount: (order.discount_cents ?? 0) / 100,
    total: (order.total_cents ?? 0) / 100,
    placedAt: order.placed_at,
    shippingAddress: order.shipping_address,
    billingAddress: order.billing_address,
    mercadoPagoPreferenceId: order.mercado_pago_preference_id,
    mercadoPagoPaymentId: order.mercado_pago_payment_id,
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      variantTitle: item.variant_title,
      quantity: item.quantity,
      unitPrice: (item.unit_price_cents ?? 0) / 100,
      subtotal: (item.subtotal_cents ?? 0) / 100,
      currency: item.currency_code ?? order.currency_code ?? "ARS",
    })),
  };
}

export async function getOrderById(orderId) {
  if (!orderId) return null;

  const { data, error } = await supabase()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateOrderFromMercadoPagoPayment(paymentId) {
  if (!paymentId) return null;

  const payment = await getPayment(paymentId);
  const orderId = payment.external_reference;

  if (!orderId) {
    throw new Error("Mercado Pago payment does not include external_reference");
  }

  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error("Order not found for Mercado Pago payment");
  }

  const mapped = mapMercadoPagoStatus(payment.status);
  const paymentMetadata = {
    status: payment.status,
    status_detail: payment.status_detail,
    payment_method_id: payment.payment_method_id,
    payment_type_id: payment.payment_type_id,
    installments: payment.installments,
    payer: payment.payer ?? null,
    transaction_amount: payment.transaction_amount ?? null,
    date_approved: payment.date_approved ?? null,
    raw: payment,
  };

  const nextOrderUpdate = {
    payment_status: mapped.paymentStatus,
    mercado_pago_payment_id: String(payment.id),
  };

  nextOrderUpdate.status = mapped.orderStatus;

  if (mapped.orderStatus === "cancelled") {
    nextOrderUpdate.cancelled_at = new Date().toISOString();
  }

  const { error: orderError } = await supabase()
    .from("orders")
    .update(nextOrderUpdate)
    .eq("id", orderId);

  if (orderError) {
    throw new Error(orderError.message);
  }

  const { data: existingPayment, error: existingPaymentError } = await supabase()
    .from("payments")
    .select("id")
    .eq("order_id", orderId)
    .eq("provider", "mercado_pago")
    .maybeSingle();

  if (existingPaymentError) {
    throw new Error(existingPaymentError.message);
  }

  if (existingPayment?.id) {
    const { error: paymentError } = await supabase()
      .from("payments")
      .update({
        provider_payment_id: String(payment.id),
        status: mapped.paymentStatus,
        metadata: paymentMetadata,
        processed_at: new Date().toISOString(),
      })
      .eq("id", existingPayment.id);

    if (paymentError) {
      throw new Error(paymentError.message);
    }
  } else {
    const { error: paymentInsertError } = await supabase()
      .from("payments")
      .insert({
        order_id: orderId,
        provider: "mercado_pago",
        provider_payment_id: String(payment.id),
        status: mapped.paymentStatus,
        amount_cents: Math.round((payment.transaction_amount ?? 0) * 100),
        currency_code: payment.currency_id ?? order.currency_code ?? "ARS",
        metadata: paymentMetadata,
      });

    if (paymentInsertError) {
      throw new Error(paymentInsertError.message);
    }
  }

  if (mapped.paymentStatus === "paid" || mapped.paymentStatus === "authorized") {
    const { error: cartUpdateError } = await supabase()
      .from("carts")
      .update({ status: "converted" })
      .eq("id", order.cart_id);

    if (cartUpdateError) {
      throw new Error(cartUpdateError.message);
    }
  }

  return getOrderById(orderId);
}

export async function listOrdersByCustomer(customerId) {
  if (!customerId) return [];

  const { data, error } = await supabase()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(serializeOrderRecord);
}
