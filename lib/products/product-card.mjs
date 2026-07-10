const MATTRESS_CARD_DEFINITIONS = {
  "Classic Special|foam": {
    lineName: "Classic",
    commercialName: "Special Foam",
    technologyLabel: "Espuma",
    heightCm: 20,
    pillowLabel: "Sin pillow",
  },
  "Classic Special|pocket": {
    lineName: "Classic",
    commercialName: "Special Pocket",
    technologyLabel: "Resortes pocket",
    heightCm: 20,
    pillowLabel: "Sin pillow",
  },
  "Classic Rest|bonell": {
    lineName: "Classic",
    commercialName: "Rest",
    technologyLabel: "Resortes Bonnell",
    heightCm: 24,
    pillowLabel: "Sin pillow",
  },
  "High Rest|foam": {
    lineName: "High Rest",
    commercialName: "Foam",
    technologyLabel: "Espuma",
    heightCm: 27,
    pillowLabel: "Sin pillow",
  },
  "High Rest|bonell": {
    lineName: "High Rest",
    commercialName: "Plush",
    technologyLabel: "Resortes Bonnell",
    heightCm: 27,
    pillowLabel: "Euro pillow",
  },
  "High Rest|pocket": {
    lineName: "High Rest",
    commercialName: "Pocket",
    technologyLabel: "Resortes pocket",
    heightCm: 27,
    pillowLabel: "Euro pillow",
  },
  "Superior Rest|foam": {
    lineName: "Superior",
    commercialName: "Mid",
    technologyLabel: "Espuma",
    heightCm: 32,
    pillowLabel: "Pillow americano",
  },
  "Superior Rest|bonell": {
    lineName: "Superior",
    commercialName: "Mid Plush",
    technologyLabel: "Resortes Bonnell",
    heightCm: 32,
    pillowLabel: "Pillow americano",
  },
  "Superior Rest|pocket": {
    lineName: "Superior",
    commercialName: "Ultra Plush",
    technologyLabel: "Resortes pocket",
    heightCm: 32,
    pillowLabel: "Pillow americano",
  },
  "Top Hotel Rest|pocket": {
    lineName: "Top Hotel",
    commercialName: "Top Hotel",
    technologyLabel: "Resortes pocket",
    heightCm: 37,
    pillowLabel: "Pillow americano",
  },
};

const GENERIC_TECHNOLOGY_LABELS = {
  foam: "Espuma",
  bonell: "Resortes Bonnell",
  pocket: "Resortes pocket",
};

const GENERIC_PILLOW_LABELS = {
  none: "Sin pillow",
  euro: "Euro pillow",
  american: "Pillow americano",
};

function normalizeLineName(lineName) {
  if (!lineName) return null;
  if (lineName.startsWith("Classic")) return "Classic";
  if (lineName === "Superior Rest") return "Superior";
  if (lineName === "Top Hotel Rest") return "Top Hotel";
  return lineName;
}

function getMeasureCount(product = {}) {
  return product.variants?.filter((variant) => variant.measureCode || variant.label || variant.title)?.length ?? 0;
}

function getMeasureSummary(product = {}) {
  const measureCount = getMeasureCount(product);
  if (!measureCount) return null;
  return `${measureCount} medida${measureCount === 1 ? "" : "s"}`;
}

function isVariantOutOfStock(variant = {}) {
  const status = variant.stockStatus ?? variant.inventoryStatus ?? variant.inventory_status ?? null;
  return ["out_of_stock", "discontinued", "unavailable"].includes(status);
}

function getStockState(product = {}, selectedVariant = null, forceOutOfStock = false) {
  if (forceOutOfStock) return "out_of_stock";

  const variants = product.variants ?? [];
  if (!variants.length) return "unconfigured";

  if (product.availability === "unavailable") return "out_of_stock";
  if (selectedVariant && isVariantOutOfStock(selectedVariant)) return "out_of_stock";
  if (variants.every((variant) => isVariantOutOfStock(variant))) {
    return "out_of_stock";
  }

  return "available";
}

export function getMattressCardDefinition(product = {}) {
  const key = `${product.line ?? ""}|${product.technology ?? ""}`;
  const definition = MATTRESS_CARD_DEFINITIONS[key];

  if (definition) return definition;

  return {
    lineName: normalizeLineName(product.line) ?? product.line ?? "Sleep",
    commercialName:
      product.displayName ??
      product.commercialAlias ??
      product.legacyName ??
      product.name ??
      "Modelo Sleep",
    technologyLabel:
      GENERIC_TECHNOLOGY_LABELS[product.technology] ??
      product.technologyLabel ??
      "Tecnología a confirmar",
    heightCm: product.heightCm ?? null,
    pillowLabel:
      GENERIC_PILLOW_LABELS[product.pillowType] ??
      product.pillowTypeLabel ??
      "Pillow a confirmar",
  };
}

export function buildMattressCardModel(product = {}, selectedVariant = null, options = {}) {
  const definition = getMattressCardDefinition(product);
  const currentPrice = selectedVariant?.price ?? product.price ?? null;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product.originalPrice ?? null;
  const discount =
    currentPrice != null && compareAtPrice && compareAtPrice > currentPrice
      ? Math.round((1 - currentPrice / compareAtPrice) * 100)
      : null;
  const stockState = getStockState(product, selectedVariant, options.forceOutOfStock);
  const measureSummary = getMeasureSummary(product);

  return {
    lineName: definition.lineName,
    commercialName: definition.commercialName,
    technologyLabel: definition.technologyLabel,
    heightLabel: definition.heightCm ? `${definition.heightCm} cm` : "Altura a confirmar",
    pillowLabel: definition.pillowLabel,
    currentPrice,
    compareAtPrice,
    discount,
    stockState,
    isFeatured: options.featured ?? product.tags?.includes("destacado") ?? false,
    saleTypeLabel: product.saleTypeLabel ?? null,
    promotionLabel: discount ? `${discount}% OFF` : null,
    installmentsLabel: currentPrice ? `12 cuotas de ${formatPrice(currentPrice / 12)}` : null,
    measureSummary,
    setSplitLabel: selectedVariant?.setSplit?.label ?? null,
  };
}

export function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}
