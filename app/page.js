import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import fallbackProducts from "@/data/products";
import { buildHomepageContent } from "@/lib/products/homepage.mjs";
import { mapSupabaseProductToCardData, mapFallbackProducts } from "@/lib/products/mappers";
import { getCatalogProducts } from "@/lib/supabase/queries/products";
import styles from "./page.module.css";

export const revalidate = 60;

const COPYRIGHT_YEAR = 2026;

export default async function Home() {
  let catalogRaw = [];

  try {
    catalogRaw = await getCatalogProducts({ limit: 64 });
  } catch (error) {
    console.error("Falling back to local catalog data:", error);
    catalogRaw = null;
  }

  const fallbackCatalog = mapFallbackProducts(fallbackProducts);
  const catalogProducts = catalogRaw?.length
    ? catalogRaw.map(mapSupabaseProductToCardData).filter(Boolean)
    : fallbackCatalog;

  const homepage = buildHomepageContent(catalogProducts);

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroShell}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>{homepage.hero.title}</h1>

            <div className={styles.heroCtas}>
              <Link href={homepage.hero.primaryCta.href} className={styles.heroBtn}>
                {homepage.hero.primaryCta.label}
              </Link>
              <a
                href="https://wa.me/541139205184"
                className={styles.heroSupportLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Hablar con un asesor
              </a>
            </div>
          </div>

          <div className={styles.heroMedia}>
            <Image
              src="/banner-home-cropped.webp"
              alt="Persona descansando sobre un colchón Sleep"
              width={2500}
              height={1300}
              priority
              sizes="(max-width: 1024px) 100vw, 46vw"
              className={styles.heroImage}
            />
          </div>
        </div>
      </section>

      <section id="catalogo" className={styles.section}>
        <div className={styles.catalogPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>{homepage.catalogPreview.eyebrow}</p>
              <h2 className={styles.sectionTitle}>{homepage.catalogPreview.title}</h2>
              <p className={styles.sectionCopy}>{homepage.catalogPreview.subtitle}</p>
            </div>
            <Link href={homepage.catalogPreview.primaryCta.href} className={styles.catalogHeaderCta}>
              {homepage.catalogPreview.primaryCta.label}
            </Link>
          </div>

          <div className={styles.catalogQuickLinks} aria-label="Atajos principales al catálogo">
            {homepage.catalogPreview.quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.catalogQuickLink}>
                <span className={styles.catalogQuickLinkLabel}>{link.label}</span>
                <span className={styles.catalogQuickLinkDescription}>{link.description}</span>
              </Link>
            ))}
          </div>

          <div className={styles.catalogSupportRow}>
            {homepage.catalogPreview.supportPoints.map((point) => (
              <p key={point} className={styles.catalogSupportPoint}>
                {point}
              </p>
            ))}
          </div>

          <div className={styles.previewGrid}>
            {homepage.catalogPreview.featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} featured />
            ))}
          </div>

          <div className={styles.catalogFooter}>
            <div className={styles.catalogFooterCopy}>
              <p className={styles.catalogFooterLabel}>Entrada directa al catálogo</p>
              <p>
                Si ya sabés la medida o querés comparar más modelos, seguí al catálogo completo con
                filtros, guía de medidas y búsqueda.
              </p>
            </div>
            <Link href={homepage.catalogPreview.secondaryCta.href} className={styles.catalogFooterCta}>
              {homepage.catalogPreview.secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrandCol}>
            <p className={styles.footerBrand}>Sleep</p>
            <p className={styles.footerTagline}>Tu Mejor Descanso</p>
          </div>
          <div className={styles.footerDivider} />
          <div className={styles.footerLinks}>
            <a href="https://wa.me/541139205184" target="_blank" rel="noopener noreferrer">
              💬 +54 11 3920-5184
            </a>
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
            <a
              href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario"
              target="_blank"
              rel="noopener noreferrer"
            >
              Defensa del Consumidor
            </a>
          </p>
          <p className={styles.footerLegal}>Diseñado con ☾ para el mejor descanso</p>
        </div>
      </footer>
    </main>
  );
}
