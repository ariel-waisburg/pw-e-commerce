import Link from "next/link";
import { cookies } from "next/headers";
import CheckoutForm from "@/components/CheckoutForm";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { serializeCartRecord } from "@/lib/cart/serializer";
import { getCartByToken } from "@/lib/cart/server";
import styles from "./checkout.module.css";

export const metadata = {
  title: "Checkout | Sleep",
  description: "Completá tus datos y pagá tu compra con Mercado Pago.",
};

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cart = serializeCartRecord(await getCartByToken(token));

  if (!cart?.items?.length) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <p className={styles.kicker}>Checkout</p>
          <h1 className={styles.pageTitle}>No hay productos para pagar</h1>
          <p className={styles.pageIntro}>
            Sumá productos al carrito antes de iniciar el proceso de compra.
          </p>
          <Link href="/catalog" className={styles.primaryButton}>
            Ir al catálogo
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <CheckoutForm cart={cart} />
    </main>
  );
}
