export const HOMEPAGE_PRIMARY_CTA = {
  label: "Encontrá tu colchón",
  href: "/catalog?saleType=mattress",
};

export const HOMEPAGE_SECONDARY_CTA = {
  label: "Ver catálogo completo",
  href: "/catalog?saleType=mattress",
};

export const HOMEPAGE_QUICK_LINKS = [
  {
    label: "Solo colchón",
    href: "/catalog?saleType=mattress",
    description: "Compará modelos sin sumar la base.",
  },
  {
    label: "Colchón + base",
    href: "/catalog?saleType=set",
    description: "Entrá directo a los conjuntos completos.",
  },
  {
    label: "Ver por medida",
    href: "/catalog/guia-medidas",
    description: "Definí el tamaño correcto antes de comparar.",
  },
];

const HOMEPAGE_PREVIEW_LIMIT = 4;

function getProductPrice(product = {}) {
  if (typeof product.price === "number" && product.price > 0) {
    return product.price;
  }

  const variantPrices = (product.variants ?? [])
    .map((variant) => variant?.price)
    .filter((price) => typeof price === "number" && price > 0);

  return variantPrices.length ? Math.min(...variantPrices) : Number.POSITIVE_INFINITY;
}

function isMattressProduct(product = {}) {
  return product.saleType === "mattress";
}

function isFeaturedProduct(product = {}) {
  return Boolean(product.isFeatured || product.tags?.includes("destacado"));
}

function compareHomepageProducts(left, right) {
  const featuredDelta = Number(isFeaturedProduct(right)) - Number(isFeaturedProduct(left));
  if (featuredDelta !== 0) return featuredDelta;

  const priceDelta = getProductPrice(left) - getProductPrice(right);
  if (priceDelta !== 0) return priceDelta;

  return String(left.name ?? left.slug ?? "").localeCompare(String(right.name ?? right.slug ?? ""), "es");
}

export function selectHomepagePreviewProducts(products = [], limit = HOMEPAGE_PREVIEW_LIMIT) {
  const mattresses = products.filter(isMattressProduct).sort(compareHomepageProducts);
  const selected = [];
  const selectedIds = new Set();
  const selectedLines = new Set();

  mattresses.forEach((product) => {
    if (selected.length >= limit) return;
    if (!product?.id || selectedIds.has(product.id)) return;
    if (product.line && selectedLines.has(product.line)) return;

    selected.push(product);
    selectedIds.add(product.id);
    if (product.line) selectedLines.add(product.line);
  });

  mattresses.forEach((product) => {
    if (selected.length >= limit) return;
    if (!product?.id || selectedIds.has(product.id)) return;

    selected.push(product);
    selectedIds.add(product.id);
  });

  return selected;
}

export function buildHomepageContent(products = []) {
  return {
    hero: {
      title: "Elegí el colchón indicado para el sueño que te merecés.",
      subtitle:
        "Entrá al catálogo con precios visibles, medidas comparables y acceso directo al modelo que mejor encaja con tu compra.",
      primaryCta: HOMEPAGE_PRIMARY_CTA,
    },
    catalogPreview: {
      eyebrow: "Catálogo Sleep",
      title: "Entrá directo a opciones reales de compra",
      subtitle:
        "Resolvé primero si querés solo colchón, conjunto o definir la medida. Después comparás productos concretos sin pasar por una guía intermedia.",
      quickLinks: HOMEPAGE_QUICK_LINKS,
      supportPoints: [
        "Precios visibles desde la primera vista.",
        "Medidas comparables sin mezclar opciones.",
        "Acceso rápido a colchón, conjunto y guía de medidas.",
      ],
      primaryCta: HOMEPAGE_PRIMARY_CTA,
      secondaryCta: HOMEPAGE_SECONDARY_CTA,
      featuredProducts: selectHomepagePreviewProducts(products),
    },
  };
}
