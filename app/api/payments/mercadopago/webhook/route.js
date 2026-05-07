import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/mercadopago/server";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { updateOrderFromMercadoPagoPayment } from "@/lib/orders/server";

const supabase = () => getSupabaseServiceRole();

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  const url = new URL(request.url);
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const dataId = url.searchParams.get("data.id") ?? payload?.data?.id ?? null;

  if (signatureHeader && !verifyWebhookSignature({ signatureHeader, requestId, dataId: String(dataId ?? "") })) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const { data: event, error: eventError } = await supabase()
    .from("webhook_events")
    .insert({
      provider: "mercado_pago",
      event_type: payload?.type ?? payload?.action ?? "unknown",
      raw_payload: payload ?? {},
      processed: false,
    })
    .select("id")
    .single();

  if (eventError) {
    return NextResponse.json({ ok: false, error: eventError.message }, { status: 500 });
  }

  try {
    if ((payload?.type ?? url.searchParams.get("type")) === "payment" && dataId) {
      const updatedOrder = await updateOrderFromMercadoPagoPayment(String(dataId));

      await supabase()
        .from("webhook_events")
        .update({
          processed: true,
          related_order_id: updatedOrder?.id ?? null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id);
    } else {
      await supabase()
        .from("webhook_events")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id);
    }
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
