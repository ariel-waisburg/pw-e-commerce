import styles from "./OrderSummaryCard.module.css";

function formatPrice(value, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrderSummaryCard({ order }) {
  return (
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
  );
}
