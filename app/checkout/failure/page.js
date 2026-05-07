import Link from "next/link";
import { getOrderById, serializeOrderRecord } from "@/lib/orders/server";
import styles from "../checkout.module.css";

function formatPrice(value, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CheckoutFailurePage({ searchParams }) {
  const params = await searchParams;
  const orderId = params?.order_id ?? params?.external_reference ?? null;
  const order = serializeOrderRecord(await getOrderById(orderId));

  return (
    <main className={styles.page}>
      <section className={styles.resultCard}>
        <p className={styles.kicker}>Pago rechazado</p>
        <h1 className={styles.pageTitle}>No pudimos completar la compra</h1>
        <p className={styles.pageIntro}>
          La orden quedó creada, pero el pago no se aprobó. Podés volver a intentar desde el checkout.
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
            Reintentar pago
          </Link>
          <Link href="/catalog" className={styles.secondaryButton}>
            Seguir viendo productos
          </Link>
        </div>
      </section>
    </main>
  );
}
