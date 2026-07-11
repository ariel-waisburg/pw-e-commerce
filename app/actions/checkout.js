"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { getCartByToken } from "@/lib/cart/server";
import { serverEnv } from "@/lib/env/server";
import { createPreference } from "@/lib/mercadopago/server";
import { getOrderById, serializeOrderRecord, updateOrderFromMercadoPagoPayment } from "@/lib/orders/server";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { requireCustomerSession } from "@/lib/supabase/customer-auth";

const supabase = () => getSupabaseServiceRole();

const checkoutSchema = z.object({
  email: z.string().email("Ingresá un email válido"),
  firstName: z.string().trim().min(2, "Ingresá tu nombre"),
  lastName: z.string().trim().min(2, "Ingresá tu apellido"),
  phone: z.string().trim().min(6, "Ingresá un teléfono válido"),
  street: z.string().trim().min(3, "Ingresá la calle"),
  streetNumber: z.string().trim().min(1, "Ingresá la altura"),
  apartment: z.string().trim().optional(),
  city: z.string().trim().min(2, "Ingresá la ciudad"),
  province: z.string().trim().min(2, "Ingresá la provincia"),
  postalCode: z.string().trim().min(3, "Ingresá el código postal"),
  notes: z.string().trim().max(600, "Las notas son demasiado largas").optional(),
});

function formatAddress(values) {
  return {
    full_name: `${values.firstName} ${values.lastName}`.trim(),
    email: values.email,
    phone: values.phone,
    street: values.street,
    number: values.streetNumber,
    apartment: values.apartment || null,
    city: values.city,
    province: values.province,
    postal_code: values.postalCode,
    country: "AR",
  };
}

function toPreferenceItems(cart) {
  return (cart.items ?? []).map((item) => ({
    id: item.variant?.id ?? item.id,
    title: item.product?.name ?? "Producto Sleep",
    description: item.variant?.title ?? undefined,
    quantity: item.quantity,
    currency_id: item.currency ?? cart.currency ?? "ARS",
    unit_price: item.unitPrice,
  }));
}

export async function createCheckoutPreferenceAction(rawInput) {
  const { session, error: sessionError } = await requireCustomerSession();
  if (sessionError) {
    throw sessionError;
  }

  const parsed = checkoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(issue?.message ?? "No se pudo validar el checkout");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cart = await getCartByToken(token);

  if (!cart || !cart.items?.length) {
    throw new Error("Tu carrito está vacío");
  }

  const shippingAddress = formatAddress(parsed.data);
  const totalCents = cart.total_cents ?? 0;
  const subtotalCents = cart.subtotal_cents ?? 0;
  const shippingCents = cart.shipping_cents ?? 0;
  const discountCents = cart.discount_cents ?? 0;

  const { error: cartClaimError } = await supabase()
    .from("carts")
    .update({ customer_id: session.user.id })
    .eq("id", cart.id);

  if (cartClaimError) {
    if (cartClaimError.code === "23503") {
      throw new Error("No pudimos asociar tu cuenta a la compra. Cerrá sesión y volvé a intentar.");
    }
    throw new Error(cartClaimError.message);
  }

  const { data: order, error: orderError } = await supabase()
    .from("orders")
    .insert({
      cart_id: cart.id,
      customer_id: session.user.id,
      status: "pending",
      payment_status: "pending",
      currency_code: cart.currency_code ?? "ARS",
      items_subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      discount_cents: discountCents,
      total_cents: totalCents,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (orderError) {
    if (orderError.code === "23503") {
      throw new Error("No pudimos asociar tu cuenta a la orden. Cerrá sesión y volvé a intentar.");
    }
    throw new Error(orderError.message);
  }

  const orderItems = (cart.items ?? []).map((item) => ({
    order_id: order.id,
    product_id: item.product?.id,
    variant_id: item.variant?.id,
    name: item.product?.name ?? "Producto Sleep",
    variant_title: item.variant?.title ?? null,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents ?? 0,
    currency_code: item.currency_code ?? cart.currency_code ?? "ARS",
    subtotal_cents: (item.quantity ?? 0) * (item.unit_price_cents ?? 0),
    metadata: {
      sku: item.variant?.sku ?? null,
    },
  }));

  const { error: orderItemsError } = await supabase().from("order_items").insert(orderItems);
  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  const baseUrl = serverEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const isPublicHttpsUrl = baseUrl.startsWith("https://");
  const preferencePayload = {
    items: toPreferenceItems(serializeCartForPreference(cart)),
    payer: {
      name: parsed.data.firstName,
      surname: parsed.data.lastName,
      email: parsed.data.email,
      phone: {
        number: parsed.data.phone,
      },
      address: {
        street_name: parsed.data.street,
        street_number: parsed.data.streetNumber,
        zip_code: parsed.data.postalCode,
      },
    },
    external_reference: order.id,
    back_urls: {
      success: `${baseUrl}/checkout/success?order_id=${order.id}`,
      pending: `${baseUrl}/checkout/pending?order_id=${order.id}`,
      failure: `${baseUrl}/checkout/failure?order_id=${order.id}`,
    },
    notification_url: `${baseUrl}/api/payments/mercadopago/webhook`,
    statement_descriptor: "SLEEP",
    metadata: {
      order_id: order.id,
      cart_id: cart.id,
    },
  };

  if (isPublicHttpsUrl) {
    preferencePayload.auto_return = "approved";
  }

  const preference = await createPreference(preferencePayload, order.id);

  const { error: orderUpdateError } = await supabase()
    .from("orders")
    .update({
      mercado_pago_preference_id: preference.id,
    })
    .eq("id", order.id);

  if (orderUpdateError) {
    throw new Error(orderUpdateError.message);
  }

  const { error: paymentError } = await supabase().from("payments").insert({
    order_id: order.id,
    provider: "mercado_pago",
    provider_payment_id: null,
    status: "pending",
    amount_cents: totalCents,
    currency_code: cart.currency_code ?? "ARS",
    metadata: {
      preference_id: preference.id,
      init_point: preference.init_point ?? null,
      sandbox_init_point: preference.sandbox_init_point ?? null,
    },
  });

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  revalidatePath("/checkout");

  return {
    orderId: order.id,
    preferenceId: preference.id,
    initPoint: preference.init_point ?? preference.sandbox_init_point,
  };
}

function serializeCartForPreference(cart) {
  return {
    id: cart.id,
    currency: cart.currency_code ?? "ARS",
    items: (cart.items ?? []).map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: (item.unit_price_cents ?? 0) / 100,
      currency: item.currency_code ?? cart.currency_code ?? "ARS",
      product: item.product,
      variant: item.variant,
    })),
  };
}

export async function getOrderAction(orderId) {
  const order = await getOrderById(orderId);
  return serializeOrderRecord(order);
}

export async function syncMercadoPagoOrderAction({ orderId, paymentId }) {
  if (paymentId) {
    const order = await updateOrderFromMercadoPagoPayment(paymentId);
    return serializeOrderRecord(order);
  }

  const order = await getOrderById(orderId);
  return serializeOrderRecord(order);
}
