import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartForm from "@/components/AddToCartForm";
import fallbackProducts from "@/data/products";
import {
  LINE_DEFINITIONS,
  TECHNOLOGY_DEFINITIONS,
} from "@/lib/products/catalog-config.mjs";
import {
  mapFallbackProductToDetail,
  mapSupabaseProductToDetail,
} from "@/lib/products/mappers";
import {
  buildCatalogStateHref,
  getCatalogStateFromSearchParams,
  getPdpContextSummary,
} from "@/lib/products/catalog-discovery.mjs";
import { getProductBySlug } from "@/lib/supabase/queries/products";
import styles from "./page.module.css";

export const revalidate = 60;

const LINE_LOOKUP = Object.fromEntries(LINE_DEFINITIONS.map((line) => [line.value, line]));
const TECHNOLOGY_LOOKUP = Object.fromEntries(
  TECHNOLOGY_DEFINITIONS.map((technology) => [technology.value, technology])
);

function SectionBadge({ tags = [] }) {
  if (!tags.length) return null;
  return (
    <div className={styles.badgeRow}>
      {tags.map((tag) => (
        <span key={tag} className={styles.badge}>
          {tag}
        </span>
      ))}
    </div>
  );
}

function FeatureGrid({ attributes = [] }) {
  if (!attributes.length) return null;

  return (
    <div className={styles.featureGrid}>
      {attributes.map((attribute) => (
        <div key={`${attribute.label}-${attribute.value}`} className={styles.featureCard}>
          <p className={styles.featureLabel}>{attribute.label}</p>
          <p className={styles.featureValue}>{attribute.value}</p>
        </div>
      ))}
    </div>
  );
}

function MediaGallery({ media, name }) {
  if (!media?.length) {
    return (
      <div className={styles.mediaGallery}>
        <div className={styles.mediaHero}>
          <div className={styles.mediaPlaceholder}>🛏️</div>
        </div>
      </div>
    );
  }

  const [primary, ...rest] = media;

  return (
    <div className={styles.mediaGallery}>
      <div className={styles.mediaHero}>
        <Image
          src={primary.url}
          alt={primary.alt ?? name}
          fill
          sizes="(max-width: 1024px) 100vw, 55vw"
          unoptimized
          className={styles.mediaImage}
        />
      </div>

      {rest.length ? (
        <div className={styles.mediaThumbRow}>
          {rest.map((asset) => (
            <div key={asset.id} className={styles.mediaThumb}>
              <Image
                src={asset.url}
                alt={asset.alt ?? name}
                fill
                sizes="120px"
                unoptimized
                className={styles.mediaImage}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AssuranceStrip() {
  return (
    <div className={styles.assuranceGrid}>
      <div className={styles.assuranceCard}>
        <strong>Compra guiada</strong>
        <p>Entrás por plaza y cerrás la variante por medida exacta.</p>
      </div>
      <div className={styles.assuranceCard}>
        <strong>Envío gratis</strong>
        <p>Con cobertura nacional en productos seleccionados.</p>
      </div>
      <div className={styles.assuranceCard}>
        <strong>12 cuotas</strong>
        <p>Una compra de ticket alto con financiación clara.</p>
      </div>
    </div>
  );
}

export default async function ProductDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  let product = null;
  let usedFallback = false;

  try {
    const supabaseProduct = await getProductBySlug(slug);
    if (supabaseProduct) {
      product = mapSupabaseProductToDetail(supabaseProduct);
    }
  } catch (error) {
    console.error(`Falling back to local product detail for ${slug}`, error);
  }

  if (!product) {
    const localProduct = fallbackProducts.find((entry) => entry.slug === slug);
    if (localProduct) {
      product = mapFallbackProductToDetail(localProduct);
      usedFallback = true;
    }
  }

  if (!product) {
    return notFound();
  }

  const lineDefinition = product.line ? LINE_LOOKUP[product.line] : null;
  const technologyDefinition = product.technology ? TECHNOLOGY_LOOKUP[product.technology] : null;
  const catalogState = getCatalogStateFromSearchParams(resolvedSearchParams);
  const pdpContext = getPdpContextSummary(catalogState);
  const catalogHref = buildCatalogStateHref(catalogState);
  const categoryLabel = product.categoryLabel ?? product.category;
  const hasConfiguredVariants = Boolean(product.variants?.length);
  const heroSpecs = [
    product.saleTypeLabel,
    product.technologyLabel,
    product.pillowTypeLabel,
    product.heightCm ? `${product.heightCm} cm de altura` : null,
    product.topFabricLabel ? `Tapa ${product.topFabricLabel}` : null,
  ].filter(Boolean);

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumbs}>
        <Link href={catalogHref}>Catálogo</Link>
        <span>·</span>
        <span>{product.line ?? categoryLabel}</span>
      </div>

      <section className={styles.heroLayout}>
        <div className={styles.mediaColumn}>
          <MediaGallery media={product.media} name={product.name} />
          <AssuranceStrip />
        </div>

        <section className={styles.infoColumn}>
          <div className={styles.introBlock}>
            {usedFallback && (
              <div className={styles.alert}>
                <strong>Información offline.</strong> Este detalle se está mostrando con datos locales
                porque no pudimos conectarnos a la base. Intentá nuevamente más tarde para ver la info
                más reciente.
              </div>
            )}

            {!usedFallback && !hasConfiguredVariants && (
              <div className={styles.alert}>
                <strong>Sin stock configurado.</strong> Todavía no cargamos medidas y precios para este
                producto. Escribinos por WhatsApp para consultar disponibilidad.
              </div>
            )}

            <p className={styles.eyebrow}>{product.line ?? product.saleTypeLabel ?? categoryLabel}</p>
            <h1 className={styles.title}>{product.name}</h1>

            {lineDefinition?.summary ? (
              <p className={styles.lead}>{lineDefinition.summary}</p>
            ) : (
              <p className={styles.lead}>{product.description}</p>
            )}

            {heroSpecs.length ? (
              <div className={styles.specRow}>
                {heroSpecs.map((item) => (
                  <span key={item} className={styles.specPill}>
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <SectionBadge tags={product.tags} />

            {pdpContext.hasContext ? (
              <div className={styles.contextCard}>
                <div className={styles.contextHeader}>
                  <p className={styles.storyEyebrow}>Tu selección actual</p>
                  <Link href={catalogHref} className={styles.contextLink}>
                    Editar respuestas
                  </Link>
                </div>
                {pdpContext.selectorChips.length ? (
                  <div className={styles.contextGroup}>
                    <span className={styles.contextLabel}>Selector</span>
                    <div className={styles.contextChipRow}>
                      {pdpContext.selectorChips.map((chip) => (
                        <span key={`selector-${chip.key}`} className={styles.contextChip}>
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {pdpContext.filterChips.length ? (
                  <div className={styles.contextGroup}>
                    <span className={styles.contextLabel}>Filtros</span>
                    <div className={styles.contextChipRow}>
                      {pdpContext.filterChips.map((chip) => (
                        <span key={`filter-${chip.key}`} className={styles.contextChip}>
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={styles.storyCard}>
            <div className={styles.storyHeader}>
              <p className={styles.storyEyebrow}>Qué define a esta opción</p>
              {lineDefinition?.comfortLabel ? (
                <span className={styles.storyBadge}>{lineDefinition.comfortLabel}</span>
              ) : null}
            </div>
            <div className={styles.storyBody}>
              {product.displayName ? (
                <p>
                  <strong>{product.displayName}.</strong>{" "}
                  {[product.saleTypeLabel, product.technologyLabel].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {technologyDefinition?.summary ? <p>{technologyDefinition.summary}</p> : null}
              {product.description ? <p>{product.description}</p> : null}
            </div>
          </div>

          <AddToCartForm
            variants={product.variants}
            defaultVariantId={product.defaultVariantId}
            preferredMeasureCode={catalogState.measure}
          />

          {!hasConfiguredVariants && (
            <a
              href="https://wa.me/541139205184"
              target="_blank"
              rel="noreferrer"
              className={styles.contextLink}
            >
              Consultar disponibilidad por WhatsApp
            </a>
          )}
        </section>
      </section>

      <section className={styles.detailSections}>
        <div className={styles.detailPanel}>
          <div className={styles.panelHeader}>
            <p className={styles.storyEyebrow}>Ficha técnica</p>
            <h2 className={styles.sectionTitle}>Lo importante, sin ruido</h2>
          </div>
          <FeatureGrid attributes={product.attributes} />
        </div>

        <div className={styles.detailPanel}>
          <div className={styles.panelHeader}>
            <p className={styles.storyEyebrow}>Descripción</p>
            <h2 className={styles.sectionTitle}>Cómo leer este producto</h2>
          </div>
          <div className={styles.longDescription}>
            <p>
              Esta familia se vende por línea y sensación de comfort, pero la variante final se
              define por medida exacta. Por eso la experiencia de compra primero orienta por plaza
              y después confirma el tamaño técnico.
            </p>
            {product.longDescription ? <p>{product.longDescription}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

async function resolveSearchParams(searchParams) {
  if (searchParams && typeof searchParams.then === "function") {
    return (await searchParams) ?? {};
  }

  return searchParams ?? {};
}
