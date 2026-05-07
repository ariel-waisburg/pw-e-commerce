import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import fallbackProducts from "@/data/products.json";
import { mapSupabaseProductToCardData, mapFallbackProducts } from "@/lib/products/mappers";
import { getFeaturedProducts } from "@/lib/supabase/queries/products";
import { getPrimaryCategories } from "@/lib/supabase/queries/categories";
import styles from "./page.module.css";

export const revalidate = 60;
const COPYRIGHT_YEAR = 2026;

const CATEGORY_EMOJI = {
  colchones: "🛏️",
  conjuntos: "🏠",
  almohadas: "😴",
  divan: "🪑",
  pillow: "☁️",
  "super-combos": "⭐",
  accesorios: "🧵",
  default: "🛒",
};

const FALLBACK_CATEGORIES = [
  { key: "conjuntos", label: "Conjunto", emoji: CATEGORY_EMOJI.conjuntos },
  { key: "colchones", label: "Colchón", emoji: CATEGORY_EMOJI.colchones },
  { key: "almohadas", label: "Almohadas", emoji: CATEGORY_EMOJI.almohadas },
  { key: "divan", label: "Diván", emoji: CATEGORY_EMOJI.divan },
  { key: "pillow", label: "Pillow", emoji: CATEGORY_EMOJI.pillow },
  { key: "super-combos", label: "Super Combos", emoji: CATEGORY_EMOJI["super-combos"] },
];

const mapCategories = (records) => {
  if (!records?.length) return FALLBACK_CATEGORIES;

  return records.map((category) => ({
    key: category.slug,
    label: category.name,
    emoji: CATEGORY_EMOJI[category.slug] ?? CATEGORY_EMOJI.default,
  }));
};

export default async function Home() {
  let featuredRaw = [];
  let categoriesRaw = [];

  try {
    [featuredRaw, categoriesRaw] = await Promise.all([
      getFeaturedProducts({ limit: 8 }),
      getPrimaryCategories({ limit: 6 }),
    ]);
  } catch (error) {
    console.error("Falling back to local catalog data:", error);
    featuredRaw = null;
    categoriesRaw = null;
  }

  const featured = featuredRaw
    ? featuredRaw.map(mapSupabaseProductToCardData).filter(Boolean)
    : mapFallbackProducts(
        fallbackProducts.filter((product) => product.tags?.includes("destacado")).slice(0, 8)
      );

  const categories = mapCategories(categoriesRaw);

  return (
    <main className={styles.main}>

      {/* Trust Bar */}
      <div className={styles.trustBar}>
        <div className={styles.trustBarItem}><span>🚚</span> Envío gratis a todo el país</div>
        <div className={styles.trustBarItem}><span>💳</span> 12 cuotas sin interés</div>
        <div className={styles.trustBarItem}><span>🛡️</span> Garantía oficial Sleep</div>
        <div className={styles.trustBarItem}><span>💬</span> Atención por WhatsApp</div>
      </div>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>HASTA 70% OFF</p>
            <h1 className={styles.heroTitle}>Tu Mejor Descanso empieza con una compra inteligente</h1>
            <p className={styles.heroSubtitle}>
              Colchones, sommiers, almohadas y combos con precio promocional, 12 cuotas sin interés y envío gratis a todo el país.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/catalog" className={styles.heroBtn}>
                Ver Productos
              </Link>
              <a href="https://wa.me/541139205184" className={styles.heroWa} target="_blank" rel="noopener noreferrer">
                💬 Consultá por WhatsApp
              </a>
            </div>
          </div>
          <div className={styles.heroMedia}>
            <Image
              src="/banner.webp"
              alt="Banner promocional Sleep"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 50vw"
              className={styles.heroImage}
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Comprá por categoría</h2>
            <p className={styles.sectionCopy}>Encontrá rápido la línea que mejor se adapta a tu espacio.</p>
          </div>
          <Link href="/catalog" className={styles.sectionLink}>Ver todo →</Link>
        </div>
        <div className={styles.categoriesGrid}>
          {categories.map((cat) => (
            <Link key={cat.key} href={`/catalog?category=${cat.key}`} className={styles.catCard}>
              <span className={styles.catEmoji}>{cat.emoji}</span>
              <span className={styles.catLabel}>{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Destacados */}
      <div className={styles.sectionAlt}>
        <div className={styles.sectionAltInner}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Destacados</h2>
            <Link href="/catalog" className={styles.sectionLink}>Ver todo →</Link>
          </div>
          <div className={styles.grid}>
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>

      {/* Trust items */}
      <section className={styles.trustStrip}>
        <div className={styles.trustItem}>
          <div className={styles.trustIconWrap}>🚚</div>
          <div>
            <strong>Entrega a todo el país</strong>
            <p>Sin costo adicional en compras seleccionadas</p>
          </div>
        </div>
        <div className={styles.trustItem}>
          <div className={styles.trustIconWrap}>💳</div>
          <div>
            <strong>12 cuotas sin interés</strong>
            <p>Con todas las tarjetas bancarias</p>
          </div>
        </div>
        <div className={styles.trustItem}>
          <div className={styles.trustIconWrap}>🛡️</div>
          <div>
            <strong>Garantía oficial</strong>
            <p>Respaldo Sleep en cada producto</p>
          </div>
        </div>
        <div className={styles.trustItem}>
          <div className={styles.trustIconWrap}>💬</div>
          <div>
            <strong>Atención personalizada</strong>
            <p>WhatsApp y teléfono directo</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrandCol}>
            <p className={styles.footerBrand}>Sleep</p>
            <p className={styles.footerTagline}>Tu Mejor Descanso</p>
          </div>
          <div className={styles.footerDivider} />
          <div className={styles.footerLinks}>
            <a href="https://wa.me/541139205184" target="_blank" rel="noopener noreferrer">💬 +54 11 3920-5184</a>
            <a href="tel:1139205184">📞 11 3920-5184</a>
            <a href="mailto:info@sleep.com.ar">✉️ info@sleep.com.ar</a>
          </div>
          <div className={styles.footerRightCol}>
            <p className={styles.paymentLabel}>Medios de pago</p>
            <div className={styles.paymentGrid}>
              <span>Visa</span>
              <span>Mastercard</span>
              <span>Amex</span>
              <span>Mercado Pago</span>
              <span>Cabal</span>
              <span>Naranja</span>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p className={styles.footerLegal}>
            © {COPYRIGHT_YEAR} Sleep. Todos los derechos reservados.{" "}
            <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" target="_blank" rel="noopener noreferrer">
              Defensa del Consumidor
            </a>
          </p>
          <p className={styles.footerLegal}>Diseñado con ☾ para el mejor descanso</p>
        </div>
      </footer>
    </main>
  );
}
