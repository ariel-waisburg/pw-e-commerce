import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import OrderSummaryCard from "@/components/OrderSummaryCard";
import { getCustomerSession } from "@/lib/supabase/customer-auth";
import { getOrderById, serializeOrderRecord } from "@/lib/orders/server";
import styles from "@/app/checkout/checkout.module.css";

export const metadata = {
  title: "Detalle de pedido | Sleep",
};

export default async function MiPedidoDetailPage({ params }) {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/login?next=/mis-pedidos");
  }

  const { id } = await params;
  const orderRecord = await getOrderById(id);

  if (!orderRecord || orderRecord.customer_id !== session.user.id) {
    notFound();
  }

  const order = serializeOrderRecord(orderRecord);

  return (
    <main className={styles.page}>
      <section className={styles.resultCard}>
        <p className={styles.kicker}>Mis pedidos</p>
        <h1 className={styles.pageTitle}>Orden #{order.number}</h1>
        <p className={styles.pageIntro}>Detalle de tu compra.</p>

        <OrderSummaryCard order={order} />

        <div className={styles.resultActions}>
          <Link href="/mis-pedidos" className={styles.secondaryButton}>
            Volver a mis pedidos
          </Link>
        </div>
      </section>
    </main>
  );
}
