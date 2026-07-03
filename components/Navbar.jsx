'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import {
  LINE_DEFINITIONS,
  SALE_TYPE_DEFINITIONS,
  TECHNOLOGY_DEFINITIONS,
} from "@/lib/products/catalog-config.mjs";
import CartDrawer from "./CartDrawer";
import styles from "./Navbar.module.css";

const QUICK_LINKS = [
  {
    label: "Catálogo completo",
    description: "Todas las líneas, medidas y accesorios en un solo lugar.",
    href: "/catalog",
  },
  {
    label: "Colchones",
    description: "Elegí por línea, confort y medida exacta.",
    href: `/catalog?saleType=${SALE_TYPE_DEFINITIONS[0].value}`,
  },
  {
    label: "Conjuntos",
    description: "Colchón con sommier, ya listo para resolver la compra.",
    href: `/catalog?saleType=${SALE_TYPE_DEFINITIONS[1].value}`,
  },
  {
    label: "Almohadas",
    description: "Tecnología y tamaño como navegación independiente.",
    href: "/catalog?category=almohadas",
  },
];

const LINE_LINKS = LINE_DEFINITIONS.map((line) => ({
  label: line.label,
  description: line.summary,
  href: `/catalog?line=${encodeURIComponent(line.value)}`,
  meta: line.comfortLabel,
}));

const TECHNOLOGY_LINKS = TECHNOLOGY_DEFINITIONS.map((technology) => ({
  label: technology.label,
  description: technology.summary,
  href: `/catalog?technology=${technology.value}`,
}));

export default function Navbar() {
  const { count, setIsOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const shellRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!shellRef.current?.contains(event.target)) {
        setProductsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setProductsOpen(false);
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const closeAll = () => {
    setMenuOpen(false);
    setProductsOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen((current) => {
      const next = !current;
      if (!next) {
        setProductsOpen(false);
      }
      return next;
    });
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo} onClick={closeAll}>
            <Image
              src="/logo.webp"
              alt="Sleep"
              width={178}
              height={85}
              className={styles.logoImage}
              priority
            />
            <span className={styles.logoTagline}>Tu Mejor Descanso</span>
          </Link>

          <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} aria-label="Principal">
            <div className={styles.dropdownShell} ref={shellRef}>
              <div className={`${styles.catalogTrigger} ${productsOpen ? styles.catalogTriggerOpen : ""}`}>
                <Link href="/catalog" className={styles.navLink} onClick={closeAll}>
                  Catálogo
                </Link>
                <button
                  type="button"
                  className={`${styles.navLink} ${styles.navButton} ${styles.catalogToggle}`}
                  aria-expanded={productsOpen}
                  aria-controls="products-menu"
                  aria-label="Abrir atajos del catálogo"
                  aria-haspopup="true"
                  onClick={() => setProductsOpen((current) => !current)}
                >
                  <span className={`${styles.chevron} ${productsOpen ? styles.chevronOpen : ""}`}>▾</span>
                </button>
              </div>

              <div
                id="products-menu"
                className={`${styles.dropdown} ${productsOpen ? styles.dropdownOpen : ""}`}
                hidden={!productsOpen}
              >
                <div className={styles.dropdownColumn}>
                  <p className={styles.dropdownHeading}>Atajos del catálogo</p>
                  <div className={styles.dropdownList}>
                    {QUICK_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={styles.dropdownCard}
                        onClick={closeAll}
                      >
                        <span className={styles.dropdownTitle}>{item.label}</span>
                        <span className={styles.dropdownDescription}>{item.description}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className={styles.dropdownColumn}>
                  <p className={styles.dropdownHeading}>Por línea</p>
                  <div className={styles.dropdownList}>
                    {LINE_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={styles.dropdownCard}
                        onClick={closeAll}
                      >
                        <span className={styles.dropdownCardTop}>
                          <span className={styles.dropdownTitle}>{item.label}</span>
                          <span className={styles.dropdownMeta}>{item.meta}</span>
                        </span>
                        <span className={styles.dropdownDescription}>{item.description}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className={styles.dropdownColumn}>
                  <p className={styles.dropdownHeading}>Tecnología</p>
                  <div className={styles.dropdownList}>
                    {TECHNOLOGY_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={styles.dropdownCard}
                        onClick={closeAll}
                      >
                        <span className={styles.dropdownTitle}>{item.label}</span>
                        <span className={styles.dropdownDescription}>{item.description}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/catalog?category=almohadas"
              className={styles.navLink}
              onClick={closeAll}
            >
              Almohadas
            </Link>

            <a
              href="https://wa.me/541139205184"
              className={`${styles.navLink} ${styles.mobileSupportLink}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeAll}
            >
              Asesor por WhatsApp
            </a>
          </nav>

          <div className={styles.actions}>
            <a
              href="https://wa.me/541139205184"
              className={styles.supportLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Asesor por WhatsApp</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
            <button className={styles.cartBtn} onClick={() => setIsOpen(true)} aria-label="Abrir carrito">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {count > 0 && <span className={styles.cartBadge}>{count}</span>}
            </button>
            <button
              className={styles.hamburger}
              onClick={toggleMenu}
              aria-label="Menú"
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>
      <CartDrawer />
    </>
  );
}
