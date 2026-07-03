import CatalogExperience from "@/components/catalog/CatalogExperience";
import fallbackProducts from "@/data/products";
import { mapSupabaseProductToCardData, mapFallbackProducts } from "@/lib/products/mappers";
import { getCatalogProducts } from "@/lib/supabase/queries/products";

export const revalidate = 60;

const FALLBACK_PRODUCTS = mapFallbackProducts(fallbackProducts);

export default async function CatalogPage({ searchParams }) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  let productsRaw = [];
  let errored = false;

  try {
    productsRaw = await getCatalogProducts({ limit: 64 });
  } catch (error) {
    console.error("Catalog fallback due to Supabase error:", error);
    errored = true;
  }

  const shouldUseFallback = errored || !productsRaw?.length;
  const allProducts = shouldUseFallback
    ? FALLBACK_PRODUCTS
    : productsRaw.map(mapSupabaseProductToCardData).filter(Boolean);

  return (
    <CatalogExperience
      products={allProducts}
      initialSearchParams={resolvedSearchParams}
      usedFallback={shouldUseFallback}
    />
  );
}

async function resolveSearchParams(searchParams) {
  if (searchParams && typeof searchParams.then === "function") {
    return (await searchParams) ?? {};
  }

  return searchParams ?? {};
}
