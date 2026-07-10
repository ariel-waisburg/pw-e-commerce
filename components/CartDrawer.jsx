'use client';

import Link from "next/link";
import { useCart } from '@/context/CartContext';
import styles from './CartDrawer.module.css';

function formatPrice(p) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p);
}

export default function CartDrawer() {
  const { items, removeItem, updateQty, total, isOpen, setIsOpen, clearCart } = useCart();

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}
      <aside className={`${styles.drawer} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Tu carrito</h2>
          <button className={styles.close} onClick={() => setIsOpen(false)} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🛒</span>
            <p>Tu carrito está vacío</p>
            <button className={styles.continueShopping} onClick={() => setIsOpen(false)}>
              Seguir comprando
            </button>
          </div>
        ) : (
          <>
            <div className={styles.items}>
              {items.map(item => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemImageWrap}>
                    <div className={styles.itemImagePlaceholder}>🛏</div>
                  </div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{item.product.name}</p>
                    <p className={styles.itemSize}>{item.size}</p>
                    <div className={styles.itemBottom}>
                      <div className={styles.qtyControl}>
                        <button onClick={() => updateQty(item.id, item.qty - 1)} disabled={item.qty <= 1}>−</button>
                        <span>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                      </div>
                      <span className={styles.itemPrice}>{formatPrice(item.unitPrice * item.qty)}</span>
                    </div>
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeItem(item.id)} aria-label="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.footer}>
              <div className={styles.shipping}>Envio gratis a todo el pais</div>
              <div className={styles.totals}>
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <div className={styles.installments}>
                <span>en 12 cuotas sin interés de {formatPrice(total / 12)}</span>
              </div>
              <Link href="/checkout" className={styles.checkout} onClick={() => setIsOpen(false)} prefetch={false}>
                Ir al checkout
              </Link>
              <button className={styles.clearBtn} onClick={clearCart}>Vaciar carrito</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
