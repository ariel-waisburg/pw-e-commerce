const FALLBACK_SIZE = "Único";

const normalizeVariants = (variants = []) =>
  variants.map((variant) => ({
    id: variant.id,
    title: variant.title ?? FALLBACK_SIZE,
    price: Math.round((variant.price ?? 0) / 100),
    compareAtPrice: variant.compareAtPrice ? Math.round(variant.compareAtPrice / 100) : undefined,
    currency: variant.currency ?? "ARS",
    stockStatus: variant.inventoryStatus ?? "in_stock",
    stockQuantity: variant.stockQuantity ?? 0,
  }));

const computeTags = (product) => [
  ...(product.isFeatured ? ["destacado"] : []),
  ...(product.badges ?? []).map((badge) => badge.toLowerCase()),
];

export function mapSupabaseProductToCardData(product) {
  if (!product) return null;

  const variants = normalizeVariants(product.variants);
  const primaryVariant = variants[0];
  if (!primaryVariant) return null;

  const sizes = variants.map((variant) => variant.title).filter(Boolean);

    return {
      id: product.id,
      slug: product.slug,
      category: product.category?.slug ?? "otros",
      line: product.tagline ?? product.metadata?.line ?? "Sleep",
      brand: "Sleep",
      name: product.name,
      variants,
      defaultVariantId: primaryVariant.id,
      sizes: sizes.length ? sizes : [FALLBACK_SIZE],
      price: primaryVariant.price,
      originalPrice: primaryVariant.compareAtPrice,
      tags: computeTags(product),
    };
  }

export function mapFallbackProducts(products) {
  return products.map((product) => {
    const sizeOptions = product.sizes?.length ? product.sizes : [FALLBACK_SIZE];
    const variantOptions = sizeOptions.map((size, index) => ({
      id: `${product.id}-${size}-${index}`,
      title: size,
      price: product.price,
      compareAtPrice: product.originalPrice,
    }));

    return {
      id: product.id,
      slug: product.slug,
      category: product.category,
      line: product.line ?? "Sleep",
      brand: product.brand ?? "Sleep",
      name: product.name,
      variants: variantOptions,
      defaultVariantId: variantOptions[0]?.id ?? `${product.id}-default`,
      sizes: sizeOptions,
      price: product.price,
      originalPrice: product.originalPrice,
      tags: product.tags ?? [],
    };
  });
}

export function mapSupabaseProductToDetail(product) {
  if (!product) return null;

  const variants = normalizeVariants(product.variants);
  const primaryVariant = variants[0];
  if (!primaryVariant) return null;

  const attributes = Array.isArray(product.attributes)
    ? product.attributes
    : Object.entries(product.attributes ?? {}).map(([label, value]) => ({
        label,
        value,
      }));

  const media = (product.media ?? []).map((asset) => ({
    id: asset.id,
    url: asset.url,
    alt: asset.alt ?? product.name,
    isPrimary: asset.isPrimary,
  }));

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    line: product.tagline ?? product.metadata?.line ?? "Sleep",
    description: product.shortDescription ?? "",
    longDescription: product.metadata?.long_description ?? product.longDescription ?? "",
    category: product.category?.slug ?? "otros",
    tags: computeTags(product),
    variants,
    defaultVariantId: primaryVariant.id,
    attributes,
    media,
  };
}

export function mapFallbackProductToDetail(product) {
  if (!product) return null;

  const variantOptions = product.sizes?.length
    ? product.sizes.map((size, index) => ({
        id: `${product.id}-${size}-${index}`,
        title: size,
        price: product.price,
        compareAtPrice: product.originalPrice,
      }))
    : [
        {
          id: `${product.id}-default`,
          title: FALLBACK_SIZE,
          price: product.price,
          compareAtPrice: product.originalPrice,
        },
      ];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    line: product.line ?? "Sleep",
    description: product.description ?? "",
    longDescription: product.description ?? "",
    category: product.category,
    tags: product.tags ?? [],
    variants: variantOptions,
    defaultVariantId: variantOptions[0]?.id,
    attributes: [],
    media: [],
  };
}
