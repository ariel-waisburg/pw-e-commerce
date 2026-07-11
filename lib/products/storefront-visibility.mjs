const HIDDEN_STOREFRONT_CATEGORIES = new Set(["almohadas", "pillow"]);

export function getProductCategorySlug(product = {}) {
  if (!product.category) return null;
  if (typeof product.category === "string") return product.category;
  return product.category.slug ?? null;
}

export function hasUsableProductMedia(product = {}) {
  const mediaGroups = [product.media, product.mediaCandidates, product.catalogMedia];
  return mediaGroups.some((media) => Array.isArray(media) && media.some((asset) => Boolean(asset?.url)));
}

export function isHiddenStorefrontCategory(category) {
  return HIDDEN_STOREFRONT_CATEGORIES.has(category);
}

export function isStorefrontProductVisible(product = {}) {
  const category = getProductCategorySlug(product);
  if (isHiddenStorefrontCategory(category)) return false;
  return hasUsableProductMedia(product);
}
