import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import fallbackProducts from "@/data/products.json";
import { mapSupabaseProductToCardData, mapFallbackProducts } from "@/lib/products/mappers";
import { getProductsByCategory, searchProducts } from "@/lib/supabase/queries/products";
import { getPrimaryCategories } from "@/lib/supabase/queries/categories";
import styles from "./page.module.css";

export const revalidate = 60;

const FALLBACK_PRODUCTS = mapFallbackProducts(fallbackProducts);

const FALLBACK_CATEGORY_CHIPS = [
  { key: "colchones", label: "Colchones" },
  { key: "almohadas", label: "Almohadas" },
  { key: "accesorios", label: "Accesorios" },
  { key: "conjuntos", label: "Conjuntos" },
  { key: "super-combos", label: "Combos" },
];

const formatQueryChip = (slug, categories) => {
  return (
    categories?.find((category) => category.slug === slug) ?? {
      slug,
      name: slug?.replace("-", " ") ?? "Todos",
    }
  );
};

function buildCategoryHref(nextCategory) {
  if (!nextCategory) return "/catalog";
  const params = new URLSearchParams({ category: nextCategory });
  return `/catalog?${params.toString()}`;
}

export default async function CatalogPage({ searchParams }) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const categoryParam = resolvedSearchParams?.category || null;
  const searchTerm = resolvedSearchParams?.q || "";

  let productsRaw = [];
  let categoriesRaw = [];
  let errored = false;
  let usedFallback = false;

  try {
    categoriesRaw = await getPrimaryCategories({ limit: 10 });

    if (searchTerm) {
      productsRaw = await searchProducts({ term: searchTerm, limit: 24 });
    } else {
      productsRaw = await getProductsByCategory({
        categorySlug: categoryParam,
        limit: 24,
      });
    }
  } catch (error) {
    console.error("Catalog fallback due to Supabase error:", error);
    errored = true;
  }

  const shouldUseFallback = errored || !productsRaw?.length;
  const products = shouldUseFallback
    ? FALLBACK_PRODUCTS.filter((product) =>
        categoryParam ? product.category === categoryParam : true
      )
    : productsRaw.map(mapSupabaseProductToCardData).filter(Boolean);
  usedFallback = shouldUseFallback;

  const categoryChips =
    categoriesRaw?.length > 0
      ? categoriesRaw.map((category) => ({
          key: category.slug,
          label: category.name,
        }))
      : FALLBACK_CATEGORY_CHIPS;

  const activeChip = categoryParam ? formatQueryChip(categoryParam, categoriesRaw) : null;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>Catálogo</p>
        <h1 className={styles.heroTitle}>
          Todo el universo Sleep
        </h1>
        <p className={styles.heroSubtitle}>
          Explorá colchones, almohadas, accesorios y combos diseñados para mejorar tu descanso. Filtrá por categoría y encontrá tu match perfecto.
        </p>
      </section>

      <section className={styles.filters}>
        {usedFallback && (
          <div className={styles.alert}>
            <strong>Mostrando datos locales.</strong> No pudimos conectar con la base en este momento,
            pero podés seguir navegando el catálogo.
          </div>
        )}
        <div className={styles.filterChips}>
          <Link
            href={buildCategoryHref(null)}
            className={`${styles.chip} ${!categoryParam ? styles.chipActive : ""}`}
          >
            Todos
          </Link>
          {categoryChips.map((chip) => (
            <Link
              key={chip.key}
              href={buildCategoryHref(chip.key)}
              className={`${styles.chip} ${categoryParam === chip.key ? styles.chipActive : ""}`}
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.results}>
        <div className={styles.resultsHeader}>
          <span className={styles.resultsCount}>
            {products.length} productos {activeChip ? `en ${activeChip.name}` : ""}
            {searchTerm ? ` para “${searchTerm}”` : ""}
          </span>
        </div>

        {products.length > 0 ? (
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span>🛏️</span>
            <p>No encontramos productos para esta combinación de filtros.</p>
            <Link className={styles.chip} href="/catalog">
              Limpiar filtros
            </Link>
          </div>
        )}
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
