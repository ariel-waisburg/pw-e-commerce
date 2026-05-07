"use client";

import { useState, useTransition } from "react";
import { createCheckoutPreferenceAction } from "@/app/actions/checkout";
import styles from "@/app/checkout/checkout.module.css";

function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

const INITIAL_FORM = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  streetNumber: "",
  apartment: "",
  city: "",
  province: "",
  postalCode: "",
  notes: "",
};

export default function CheckoutForm({ cart }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const response = await createCheckoutPreferenceAction(form);
        if (!response?.initPoint) {
          throw new Error("No se pudo iniciar el pago");
        }

        window.location.assign(response.initPoint);
      } catch (submitError) {
        setError(submitError.message ?? "No se pudo iniciar el pago");
      }
    });
  }

  return (
    <div className={styles.layout}>
      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.cardHeader}>
          <p className={styles.kicker}>Checkout</p>
          <h1 className={styles.pageTitle}>Finalizá tu compra</h1>
          <p className={styles.pageIntro}>
            Completá tus datos y te redirigimos a Mercado Pago para pagar de forma segura.
          </p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos de contacto</h2>
          <div className={styles.gridTwo}>
            <label className={styles.field}>
              <span>Email</span>
              <input name="email" type="email" value={form.email} onChange={handleChange} required />
            </label>
            <label className={styles.field}>
              <span>Teléfono</span>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} required />
            </label>
          </div>
          <div className={styles.gridTwo}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input name="firstName" value={form.firstName} onChange={handleChange} required />
            </label>
            <label className={styles.field}>
              <span>Apellido</span>
              <input name="lastName" value={form.lastName} onChange={handleChange} required />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dirección de entrega</h2>
          <div className={styles.gridTwo}>
            <label className={styles.field}>
              <span>Calle</span>
              <input name="street" value={form.street} onChange={handleChange} required />
            </label>
            <label className={styles.field}>
              <span>Altura</span>
              <input name="streetNumber" value={form.streetNumber} onChange={handleChange} required />
            </label>
          </div>
          <div className={styles.gridTwo}>
            <label className={styles.field}>
              <span>Departamento / Piso</span>
              <input name="apartment" value={form.apartment} onChange={handleChange} />
            </label>
            <label className={styles.field}>
              <span>Código postal</span>
              <input name="postalCode" value={form.postalCode} onChange={handleChange} required />
            </label>
          </div>
          <div className={styles.gridTwo}>
            <label className={styles.field}>
              <span>Ciudad</span>
              <input name="city" value={form.city} onChange={handleChange} required />
            </label>
            <label className={styles.field}>
              <span>Provincia</span>
              <input name="province" value={form.province} onChange={handleChange} required />
            </label>
          </div>
          <label className={styles.field}>
            <span>Notas para la entrega</span>
            <textarea name="notes" rows="4" value={form.notes} onChange={handleChange} />
          </label>
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.primaryButton} type="submit" disabled={isPending}>
          {isPending ? "Conectando con Mercado Pago..." : "Ir a pagar"}
        </button>
      </form>

      <aside className={styles.summaryCard}>
        <div className={styles.cardHeader}>
          <p className={styles.kicker}>Resumen</p>
          <h2 className={styles.summaryTitle}>Tu pedido</h2>
        </div>

        <div className={styles.itemsList}>
          {cart.items.map((item) => (
            <div key={item.id} className={styles.summaryItem}>
              <div>
                <p className={styles.summaryItemName}>{item.product?.name ?? "Producto Sleep"}</p>
                <p className={styles.summaryItemMeta}>
                  {item.variant?.title ?? "Único"} · {item.quantity} unidad{item.quantity > 1 ? "es" : ""}
                </p>
              </div>
              <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
            </div>
          ))}
        </div>

        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Envío</span>
            <span>{cart.shipping === 0 ? "Gratis" : formatPrice(cart.shipping)}</span>
          </div>
          {cart.discount > 0 ? (
            <div className={styles.totalRow}>
              <span>Descuento</span>
              <span>-{formatPrice(cart.discount)}</span>
            </div>
          ) : null}
          <div className={`${styles.totalRow} ${styles.totalRowStrong}`}>
            <span>Total</span>
            <strong>{formatPrice(cart.total)}</strong>
          </div>
        </div>

        <p className={styles.securityNote}>
          Procesamos el pago con Mercado Pago. Vas a poder pagar con tarjeta, saldo en cuenta o medios habilitados por tu cuenta.
        </p>
      </aside>
    </div>
  );
}
