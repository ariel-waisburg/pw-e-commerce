import Image from "next/image";
import { notFound } from "next/navigation";
import AddToCartForm from "@/components/AddToCartForm";
import fallbackProducts from "@/data/products.json";
import {
  mapSupabaseProductToDetail,
  mapFallbackProductToDetail,
} from "@/lib/products/mappers";
import { getProductBySlug } from "@/lib/supabase/queries/products";
import styles from "./page.module.css";

export const revalidate = 60;

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
        <div className={styles.mediaItem}>
          <div className={styles.mediaPlaceholder}>🛏️</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mediaGallery}>
      {media.map((asset) => (
        <div key={asset.id} className={styles.mediaItem}>
          <Image
            src={asset.url}
            alt={asset.alt ?? name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}

export default async function ProductDetailPage({ params }) {
  const { slug } = params;
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

  return (
    <main className={styles.page}>
      <section>
        <MediaGallery media={product.media} name={product.name} />
      </section>
      <section className={styles.info}>
        <div>
          {usedFallback && (
            <div className={styles.alert}>
              <strong>Información offline.</strong> Este detalle se está mostrando con datos locales
              porque no pudimos conectarnos a la base. Intentá nuevamente más tarde para ver la info
              más reciente.
            </div>
          )}
          <p className={styles.eyebrow}>{product.category}</p>
          <h1 className={styles.title}>{product.name}</h1>
          <p className={styles.description}>{product.description}</p>
          <SectionBadge tags={product.tags} />
        </div>

        <AddToCartForm variants={product.variants} defaultVariantId={product.defaultVariantId} />

        <FeatureGrid attributes={product.attributes} />

        {product.longDescription && (
          <div className={styles.longDescription}>
            <p>{product.longDescription}</p>
          </div>
        )}
      </section>
    </main>
  );
}
