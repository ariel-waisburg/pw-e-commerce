import { cache } from "react";
import { createSupabaseServerClient } from "../server.js";
import { normalizeSupabaseProductRecord } from "./product-normalizer.mjs";

const baseProductSelect = `
  id,
  slug,
  sku_base,
  name,
  tagline,
  short_description,
  long_description,
  attributes,
  metadata,
  status,
  is_featured,
  category:categories!products_category_id_fkey (
    id,
    slug,
    name
  ),
  variants:product_variants (
    id,
    sku,
    title,
    price_cents,
    compare_at_price_cents,
    currency_code,
    stock_quantity,
    inventory_status,
    dimensions,
    metadata
  ),
  media:product_media (
    id,
    url,
    alt,
    is_primary,
    sort_index
  )
`;

async function fetchProducts(queryBuilder) {
  const { data, error } = await queryBuilder;
  if (error) {
    throw new Error(`Supabase products fetch failed: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.map(normalizeSupabaseProductRecord).filter(Boolean);
}

export const getFeaturedProducts = cache(async ({ limit = 6 } = {}) => {
  const supabase = createSupabaseServerClient();
  const query = supabase
    .from("products")
    .select(baseProductSelect)
    .eq("status", "active")
    .eq("is_featured", true)
    .limit(limit)
    .order("name", { ascending: true });

  query.order("sort_index", { foreignTable: "product_media", ascending: true });

  return fetchProducts(query);
});

export const getProductBySlug = cache(async (slug) => {
  const supabase = createSupabaseServerClient();
  const query = supabase
    .from("products")
    .select(baseProductSelect)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  const result = await fetchProducts(query);
  return result[0] ?? null;
});

export const getProductsByCategory = cache(
  async ({ categorySlug, minPrice, maxPrice, featuredOnly = false, limit = 12, page = 1 }) => {
    const supabase = createSupabaseServerClient();
    const offset = (page - 1) * limit;

    let categoryId = null;
    if (categorySlug) {
      const { data: categoryRecord, error: categoryError } = await supabase
        .from("categories")
        .select("id, slug, name")
        .eq("slug", categorySlug)
        .single();

      if (categoryError) {
        return [];
      }

      categoryId = categoryRecord.id;
    }

    let query = supabase
      .from("products")
      .select(baseProductSelect, { count: "exact" })
      .eq("status", "active")
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (categorySlug) {
      query = query.eq("category_id", categoryId);
    }

    if (featuredOnly) {
      query = query.eq("is_featured", true);
    }

    query.order("sort_index", { foreignTable: "product_media", ascending: true });

    const rawProducts = await fetchProducts(query);
    const filtered = rawProducts.filter((product) => {
      if (!minPrice && !maxPrice) return true;
      if (!product.priceRange) return true;
      const { min, max } = product.priceRange;
      if (minPrice && max < minPrice) return false;
      if (maxPrice && min > maxPrice) return false;
      return true;
    });

    return filtered;
  }
);

export const searchProducts = cache(async ({ term, limit = 8 }) => {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select(baseProductSelect)
    .eq("status", "active")
    .limit(limit);

  if (term) {
    query = query.or(
      `name.ilike.%${term}%,tagline.ilike.%${term}%,short_description.ilike.%${term}%`
    );
  }

  return fetchProducts(query);
});

export const getCatalogProducts = cache(async ({ featuredOnly = false, limit = 48, page = 1 } = {}) => {
  const supabase = createSupabaseServerClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select(baseProductSelect)
    .eq("status", "active")
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (featuredOnly) {
    query = query.eq("is_featured", true);
  }

  query.order("sort_index", { foreignTable: "product_media", ascending: true });

  return fetchProducts(query);
});
