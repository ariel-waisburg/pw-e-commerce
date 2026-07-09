import { getSupabaseServiceRole } from "@/lib/supabase/server";

const ADMIN_PRODUCT_SELECT = `
  id,
  slug,
  sku_base,
  name,
  tagline,
  short_description,
  long_description,
  status,
  is_featured,
  created_at,
  updated_at,
  variants:product_variants (
    id,
    sku,
    title,
    price_cents,
    compare_at_price_cents,
    currency_code,
    stock_quantity
  )
`;

function toProductRow(input) {
  return {
    name: input.name,
    slug: input.slug,
    sku_base: input.skuBase,
    tagline: input.tagline || null,
    short_description: input.shortDescription || null,
    long_description: input.longDescription || null,
    status: input.status,
    is_featured: input.isFeatured,
  };
}

function toVariantRows(productId, variants) {
  return variants.map((variant) => ({
    product_id: productId,
    sku: variant.sku,
    title: variant.title,
    price_cents: variant.priceCents,
    compare_at_price_cents: variant.compareAtPriceCents ?? null,
    stock_quantity: variant.stockQuantity,
  }));
}

export async function listAdminProducts() {
  const { data, error } = await getSupabaseServiceRole()
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminProductById(id) {
  const { data, error } = await getSupabaseServiceRole()
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function createAdminProduct(input) {
  const supabase = getSupabaseServiceRole();

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert(toProductRow(input))
    .select("id")
    .single();

  if (productError) {
    if (productError.code === "23505") {
      throw new Error("Ya existe un producto con ese slug");
    }
    throw new Error(productError.message);
  }

  const { error: variantsError } = await supabase
    .from("product_variants")
    .insert(toVariantRows(product.id, input.variants));

  if (variantsError) throw new Error(variantsError.message);

  return getAdminProductById(product.id);
}

export async function updateAdminProduct(id, input) {
  const supabase = getSupabaseServiceRole();

  const { error: productError } = await supabase.from("products").update(toProductRow(input)).eq("id", id);
  if (productError) {
    if (productError.code === "23505") {
      throw new Error("Ya existe un producto con ese slug");
    }
    throw new Error(productError.message);
  }

  const { error: deleteError } = await supabase.from("product_variants").delete().eq("product_id", id);
  if (deleteError) throw new Error(deleteError.message);

  const { error: variantsError } = await supabase
    .from("product_variants")
    .insert(toVariantRows(id, input.variants));

  if (variantsError) throw new Error(variantsError.message);

  return getAdminProductById(id);
}

export async function deleteAdminProduct(id) {
  const { error } = await getSupabaseServiceRole().from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
