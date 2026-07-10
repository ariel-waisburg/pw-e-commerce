import { normalizeCatalogProduct } from "./catalog.mjs";

const STORAGE_BUCKET = "colchones";

// Filenames match the Supabase "colchones" bucket's own naming (e.g. MID/PLUSH),
// which doesn't always match the commercial display name shown to shoppers.
const PRODUCT_IMAGE_BY_KEY = {
  "Classic Special|foam|mattress": "CLASSIC-FOAM.jpg",
  "Classic Special|foam|set": "CLASSIC-FOAM-S.jpg",
  "Classic Special|pocket|mattress": "CLASSIC-POCKET.jpg",
  "Classic Special|pocket|set": "CLASSIC-POCKET-S.jpg",
  "Classic Rest|bonell|mattress": "CLASSIC-REST-BONELL.jpg",
  "Classic Rest|bonell|set": "CLASSIC-REST-BONELL-S.jpg",
  "High Rest|foam|mattress": "HIGH-REST-FIRM.jpg",
  "High Rest|foam|set": "HIGH-REST-FIRM-S.jpg",
  "High Rest|pocket|mattress": "HIGH-REST-MID.jpg",
  "High Rest|pocket|set": "HIGH-REST-MID-S.jpg",
  "High Rest|bonell|mattress": "HIGH-REST-PLUSH.jpg",
  "High Rest|bonell|set": "HIGH-REST-PLUSH-S.jpg",
  "Superior Rest|foam|mattress": "SUPERIOR-REST-MID.jpg",
  "Superior Rest|foam|set": "SUPERIOR-REST-MID-S.jpg",
  "Superior Rest|pocket|mattress": "SUPERIOR-REST-ULTRA-PLUSH.jpg",
  "Superior Rest|pocket|set": "SUPERIOR-REST-ULTRA-PLUSH-S.jpg",
  "Superior Rest|bonell|mattress": "SUPERIOR-REST-MID-PLUSH.jpg",
  "Superior Rest|bonell|set": "SUPERIOR-REST-MID-PLUSH-S.jpg",
  "Top Hotel Rest|pocket|mattress": "TOP-HOTEL-REST.jpg",
  "Top Hotel Rest|pocket|set": "TOP-HOTEL-REST-S.jpg",
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
