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

        {order ? (
          <>
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

            <div className={styles.itemsList}>
              {order.items.map((item) => (
                <div key={item.id} className={styles.summaryItem}>
                  <div>
                    <p className={styles.summaryItemName}>{item.name}</p>
                    <p className={styles.summaryItemMeta}>
                      {item.variantTitle ?? "Único"} · {item.quantity} unidad{item.quantity > 1 ? "es" : ""}
                    </p>
                  </div>
                  <strong>{formatPrice(item.subtotal, item.currency)}</strong>
                </div>
              ))}
            </div>
          </>
        ) : null}

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
