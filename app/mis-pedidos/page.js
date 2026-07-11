import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/supabase/customer-auth";
import { listOrdersByCustomer } from "@/lib/orders/server";
import styles from "./mis-pedidos.module.css";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value));
}

function formatPrice(value, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export const metadata = {
  title: "Mis pedidos | Sleep",
};

export default async function MisPedidosPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/login?next=/mis-pedidos");
  }

  const orders = await listOrdersByCustomer(session.user.id);

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <p className={styles.kicker}>Tu cuenta</p>
        <h1 className={styles.pageTitle}>Mis pedidos</h1>

        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Todavía no hiciste ningún pedido.</p>
            <Link href="/catalog" className={styles.primaryButton}>
              Ver catálogo
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {orders.map((order) => (
              <li key={order.id} className={styles.card}>
                <Link href={`/mis-pedidos/${order.id}`} className={styles.cardLink}>
                  <div>
                    <p className={styles.cardNumber}>Orden #{order.number}</p>
                    <p className={styles.cardDate}>{formatDate(order.placedAt)}</p>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardStatus}>{order.paymentStatus}</span>
                    <strong>{formatPrice(order.total, order.currency)}</strong>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
