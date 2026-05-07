import { createHmac, timingSafeEqual } from "crypto";
import { serverEnv } from "@/lib/env/server";

const MERCADO_PAGO_API_URL = "https://api.mercadopago.com";

async function mercadoPagoFetch(path, options = {}) {
  const response = await fetch(`${MERCADO_PAGO_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${serverEnv.MERCADO_PAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const cause = data?.message ?? data?.error ?? `Mercado Pago request failed with ${response.status}`;
    throw new Error(cause);
  }

  return data;
}

export async function createPreference(payload, idempotencyKey) {
  return mercadoPagoFetch("/checkout/preferences", {
    method: "POST",
    headers: idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : undefined,
    body: JSON.stringify(payload),
  });
}

export async function getPayment(paymentId) {
  return mercadoPagoFetch(`/v1/payments/${paymentId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

function parseSignatureHeader(signatureHeader) {
  return signatureHeader
    .split(",")
    .map((part) => part.trim())
    .reduce((acc, part) => {
      const [key, value] = part.split("=");
      if (key && value) acc[key] = value;
      return acc;
    }, {});
}

export function verifyWebhookSignature({ signatureHeader, requestId, dataId }) {
  if (!signatureHeader || !requestId || !dataId) return false;

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed.ts || !parsed.v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${parsed.ts};`;
  const digest = createHmac("sha256", serverEnv.MERCADO_PAGO_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  const expected = Buffer.from(digest);
  const received = Buffer.from(parsed.v1);

  if (expected.length !== received.length) return false;

  return timingSafeEqual(expected, received);
}

export function mapMercadoPagoStatus(status) {
  switch (status) {
    case "approved":
      return { paymentStatus: "paid", orderStatus: "confirmed" };
    case "authorized":
      return { paymentStatus: "authorized", orderStatus: "confirmed" };
    case "refunded":
    case "charged_back":
      return { paymentStatus: "refunded", orderStatus: "refunded" };
    case "cancelled":
    case "rejected":
      return { paymentStatus: "failed", orderStatus: "cancelled" };
    default:
      return { paymentStatus: "pending", orderStatus: "pending" };
  }
}
