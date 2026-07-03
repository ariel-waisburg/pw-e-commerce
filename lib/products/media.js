import { normalizeCatalogProduct } from "./catalog.mjs";

const STORAGE_BUCKET = "colchones";

const PRODUCT_IMAGE_BY_KEY = {
  "Classic Rest|foam|mattress": "CLASSIC-FOAM-1.jpg",
  "Classic Rest|foam|set": "CLASSIC-FOAM.jpg",
  "Classic Rest|bonell|mattress": "CLASSIC-REST-BONELL-1.jpg",
  "Classic Rest|bonell|set": "CLASSIC-REST-BONELL.jpg",
  "Classic Rest|pocket|mattress": "CLASSIC-POCKET-1.jpg",
  "Classic Rest|pocket|set": "CLASSIC-POCKET.jpg",
  "High Rest|foam|mattress": "HIGH-REST-FIRM-1.jpg",
  "High Rest|foam|set": "HIGH-REST-FIRM.jpg",
  "High Rest|pocket|mattress": "HIGH-REST-MID-1.jpg",
  "High Rest|pocket|set": "HIGH-REST-MID.jpg",
  "High Rest|bonell|mattress": "HIGH-REST-PLUSH-1.jpg",
  "High Rest|bonell|set": "HIGH-REST-PLUSH.jpg",
  "Superior Rest|foam|mattress": "SUPERIOR-REST-MID-1.jpg",
  "Superior Rest|foam|set": "SUPERIOR-REST-MID.jpg",
  "Superior Rest|pocket|mattress": "SUPERIOR-REST-ULTRA-PLUSH-1.jpg",
  "Superior Rest|pocket|set": "SUPERIOR-REST-ULTRA-PLUSH.jpg",
  "Superior Rest|bonell|mattress": "SUPERIOR-REST-MID-PLUSH-1.jpg",
  "Superior Rest|bonell|set": "SUPERIOR-REST-MID-PLUSH.jpg",
  "Top Hotel Rest|pocket|mattress": "TOP-HOTEL-REST-1.jpg",
  "Top Hotel Rest|pocket|set": "TOP-HOTEL-REST.jpg",
};

function buildImageKey(product = {}) {
  const normalized = normalizeCatalogProduct({
    ...product,
    line: product.line ?? product.linea ?? product.metadata?.line ?? product.metadata?.linea ?? product.metadata?.line_family ?? product.tagline,
    technology:
      product.technology ??
      product.tecnologia ??
      product.metadata?.technology ??
      product.metadata?.tecnologia ??
      product.metadata?.core_technology ??
      product.metadata?.variante,
    saleType:
      product.saleType ??
      product.metadata?.sale_type ??
      product.metadata?.type ??
      product.type,
    variants: product.variants ?? [],
  });

  return [normalized.line, normalized.technology, normalized.saleType].join("|");
}

export function getProductImageFilename(product = {}) {
  return PRODUCT_IMAGE_BY_KEY[buildImageKey(product)] ?? null;
}

export function getStorageMediaRef(product = {}) {
  const filename = getProductImageFilename(product);
  if (!filename) return null;

  return {
    bucket: STORAGE_BUCKET,
    path: filename,
    alt: product.name ?? product.line ?? "Producto Sleep",
  };
}

export function getLocalMediaRef(product = {}) {
  const filename = getProductImageFilename(product);
  if (!filename) return null;

  return {
    id: `${product.slug ?? product.id ?? buildImageKey(product)}-primary`,
    url: `/products/${filename}`,
    alt: product.name ?? product.line ?? "Producto Sleep",
    isPrimary: true,
  };
}

export function getCatalogMedia(product = {}) {
  const localRef = getLocalMediaRef(product);
  return localRef ? [localRef] : [];
}

export function getCardMediaCandidates(product = {}) {
  const seenUrls = new Set();
  const candidates = [...(product.media ?? []), ...getCatalogMedia(product)];

  return candidates.filter((asset) => {
    if (!asset?.url || seenUrls.has(asset.url)) return false;
    seenUrls.add(asset.url);
    return true;
  });
}

export function getDerivedProductMedia(product = {}) {
  if (Array.isArray(product.media) && product.media.length) {
    return product.media;
  }

  return getCatalogMedia(product);
}
