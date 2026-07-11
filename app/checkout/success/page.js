import Link from "next/link";
import OrderSummaryCard from "@/components/OrderSummaryCard";
import { getOrderById, serializeOrderRecord, updateOrderFromMercadoPagoPayment } from "@/lib/orders/server";
import styles from "../checkout.module.css";

export default async function CheckoutSuccessPage({ searchParams }) {
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
        <p className={styles.kicker}>Pago recibido</p>
        <h1 className={styles.pageTitle}>Tu compra fue registrada</h1>
        <p className={styles.pageIntro}>
          {order?.paymentStatus === "paid"
            ? "Mercado Pago confirmó el pago y ya estamos preparando tu pedido."
            : "Recibimos tu operación. Si el pago todavía se está confirmando, lo vamos a actualizar automáticamente."}
        </p>

        {order ? <OrderSummaryCard order={order} /> : null}

        <div className={styles.resultActions}>
          <Link href="/catalog" className={styles.primaryButton}>
            Seguir comprando
          </Link>
          <a href="https://wa.me/541139205184" className={styles.secondaryButton} target="_blank" rel="noopener noreferrer">
            Consultar por WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
