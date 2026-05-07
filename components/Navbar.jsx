'use client';

import Link from 'next/link';
import Image from "next/image";
import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import CartDrawer from './CartDrawer';
import styles from './Navbar.module.css';

const navLinks = [
  {
    label: 'Productos',
    href: '/catalog',
    children: [
      {
        label: 'Conjunto',
        href: '/catalog?category=conjuntos',
        sub: [
          { label: 'Classic Rest', href: '/catalog?category=conjuntos&line=Classic+Rest' },
          { label: 'High Rest', href: '/catalog?category=conjuntos&line=High+Rest' },
          { label: 'Superior Rest', href: '/catalog?category=conjuntos&line=Superior+Rest' },
          { label: 'Top Hotel Rest', href: '/catalog?category=conjuntos&line=Top+Hotel+Rest' },
        ],
      },
      {
        label: 'Colchón',
        href: '/catalog?category=colchones',
        sub: [
          { label: 'Classic Rest', href: '/catalog?category=colchones&line=Classic+Rest' },
          { label: 'High Rest', href: '/catalog?category=colchones&line=High+Rest' },
          { label: 'Superior Rest', href: '/catalog?category=colchones&line=Superior+Rest' },
          { label: 'Top Hotel Rest', href: '/catalog?category=colchones&line=Top+Hotel+Rest' },
        ],
      },
      { label: 'Almohadas', href: '/catalog?category=almohadas' },
      { label: 'Diván', href: '/catalog?category=divan' },
      {
        label: 'Pillow',
        href: '/catalog?category=pillow',
        sub: [
          { label: 'High Rest', href: '/catalog?category=pillow&line=High+Rest' },
          { label: 'Top Hotel Rest', href: '/catalog?category=pillow&line=Top+Hotel+Rest' },
        ],
      },
      { label: 'Super Combos', href: '/catalog?category=super-combos' },
    ],
  },
  { label: 'Contacto', href: '/contacto' },
];

export default function Navbar() {
  const { count, setIsOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
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

          <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
            {navLinks.map((link) => (
              <div
                key={link.href}
                className={styles.navItem}
                onMouseEnter={() => link.children && setActiveDropdown(link.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link href={link.href} className={styles.navLink} onClick={() => setMenuOpen(false)}>
                  {link.label}
                  {link.children && <span className={styles.chevron}>▾</span>}
                </Link>

                {link.children && activeDropdown === link.label && (
                  <div className={styles.dropdown}>
                    {link.children.map((child) => (
                      <div key={child.href} className={styles.dropdownGroup}>
                        <Link href={child.href} className={styles.dropdownTitle}>
                          {child.label}
                        </Link>
                        {child.sub && (
                          <div className={styles.dropdownSub}>
                            {child.sub.map((s) => (
                              <Link key={s.href} href={s.href} className={styles.dropdownSubLink}>
                                {s.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className={styles.actions}>
            <a href="https://wa.me/541139205184" className={styles.waBtn} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            <button className={styles.cartBtn} onClick={() => setIsOpen(true)} aria-label="Abrir carrito">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {count > 0 && <span className={styles.cartBadge}>{count}</span>}
            </button>
            <button className={styles.hamburger} onClick={() => setMenuOpen(v => !v)} aria-label="Menú">
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>
      <CartDrawer />
    </>
  );
}
