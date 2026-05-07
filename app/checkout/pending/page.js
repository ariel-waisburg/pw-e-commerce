import Link from "next/link";
import { getOrderById, serializeOrderRecord, updateOrderFromMercadoPagoPayment } from "@/lib/orders/server";
import styles from "../checkout.module.css";

function formatPrice(value, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CheckoutPendingPage({ searchParams }) {
  const params = await searchParams;
  const paymentId = params?.payment_id ?? params?.collection_id ?? null;
  const orderId = params?.order_id ?? params?.external_reference ?? null;

  const orderRecord = paymentId
    ? await updateOrderFromMercadoPagoPayment(String(paymentId))
    : await getOrderById(orderId);
  const order = serializeOrderRecord(orderRecord);

  return (
    <main className={styles.page}>
      <section className={styles.resultCard}>
        <p className={styles.kicker}>Pago pendiente</p>
        <h1 className={styles.pageTitle}>Estamos esperando la confirmación</h1>
        <p className={styles.pageIntro}>
          Mercado Pago registró la operación, pero el cobro todavía no quedó acreditado. Cuando cambie el estado, se actualiza desde el webhook.
        </p>

        {order ? (
          <div className={styles.resultMeta}>
            <div>
              <span>Orden</span>
              <strong>#{order.number}</strong>
            </div>
            <div>
              <span>Estado</span>
              <strong>{order.paymentStatus}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatPrice(order.total, order.currency)}</strong>
            </div>
          </div>
        ) : null}

        <div className={styles.resultActions}>
          <Link href="/checkout" className={styles.primaryButton}>
            Volver al checkout
          </Link>
          <Link href="/catalog" className={styles.secondaryButton}>
            Volver al catálogo
          </Link>
        </div>
      </section>
    </main>
  );
}
