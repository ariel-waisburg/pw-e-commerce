import { enrichProductForSleepIntent, parseMeasureSelection } from "./sleep-intent.mjs";

function stripAccents(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toComparable(value = "") {
  return stripAccents(String(value)).trim().toLowerCase();
}

const TYPO_FIXES = {
  quen: "queen",
  quenn: "queen",
  reorte: "resorte",
  reortes: "resortes",
  resorte: "resorte",
  memory: "memory",
  viscoelastico: "viscoelastica",
};

const DEFAULT_RELATED_CATEGORIES = [
  { slug: "colchones", label: "Colchones" },
  { slug: "conjuntos", label: "Conjuntos" },
  { slug: "almohadas", label: "Almohadas" },
  { slug: "pillow", label: "Pillow Top" },
];

function normalizeQuery(value = "") {
  return toComparable(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => TYPO_FIXES[token] ?? token)
    .join(" ");
}

function getTechnologyIntent(normalizedQuery) {
  if (normalizedQuery.includes("pocket")) return { technology: "pocket", technologyGroup: null };
  if (normalizedQuery.includes("bonell") || normalizedQuery.includes("tradicional")) {
    return { technology: "bonell", technologyGroup: null };
  }
  if (normalizedQuery.includes("foam") || normalizedQuery.includes("espuma")) {
    return { technology: "foam", technologyGroup: null };
  }
  if (normalizedQuery.includes("resorte")) {
    return { technology: null, technologyGroup: "springs" };
  }
  return { technology: null, technologyGroup: null };
}

export function parseSearchIntent(query = "") {
  const normalizedQuery = normalizeQuery(query);
  const measureMatch = parseMeasureSelection(normalizedQuery);
  const { technology, technologyGroup } = getTechnologyIntent(normalizedQuery);

  return {
    rawQuery: query,
    normalizedQuery,
    saleType: normalizedQuery.includes("colchon") ? "mattress" : normalizedQuery.includes("conjunto") ? "set" : null,
    category: normalizedQuery.includes("almohada")
      ? "almohadas"
      : normalizedQuery.includes("pillow top")
        ? "pillow"
        : normalizedQuery.includes("divan")
          ? "divan"
          : null,
    measure: measureMatch.measureCode,
    measureWarning: measureMatch.warning,
    firmness: normalizedQuery.includes("firme")
      ? "firm"
      : normalizedQuery.includes("suave")
        ? "soft"
        : normalizedQuery.includes("equilibr")
          ? "balanced"
          : null,
    technology,
    technologyGroup,
    line: normalizedQuery.includes("hotelero") ? "Top Hotel Rest" : null,
    sleepMode: normalizedQuery.includes("pareja") ? "partner" : normalizedQuery.includes("solo") ? "solo" : null,
    pillowTechnology:
      normalizedQuery.includes("memory foam") || normalizedQuery.includes("visco")
        ? "viscoelastica"
        : normalizedQuery.includes("silic")
          ? "silicona"
          : normalizedQuery.includes("fibra")
            ? "fibra"
            : null,
  };
}

function getComparableText(product = {}) {
  return toComparable(
    [
      product.name,
      product.description,
      product.line,
      product.technology,
      product.technologyLabel,
      product.pillowTechnology,
      product.category,
    ].join(" ")
  );
}

function getAvailabilityPriority(product = {}) {
  if (product.availability === "available_now") return 3;
  if (product.availability === "low_stock") return 2;
  if (product.availability === "backorder") return 1;
  return 0;
}

function scoreProductAgainstIntent(product, intent) {
  if (intent.category && product.category !== intent.category) return 0;
  if (intent.saleType && product.saleType !== intent.saleType) return 0;

  let score = 0;
  const text = getComparableText(product);

  if (intent.saleType && product.saleType === intent.saleType) score += 8;
  if (intent.category && product.category === intent.category) score += 8;
  if (intent.line && product.line === intent.line) score += 8;
  if (intent.measure && product.variants.some((variant) => variant.measureCode === intent.measure)) score += 10;
  if (intent.firmness && product.firmness === intent.firmness) score += 5;
  if (intent.technology && product.technology === intent.technology) score += 6;
  if (intent.technologyGroup === "springs" && ["bonell", "pocket"].includes(product.technology)) score += 4;
  if (intent.sleepMode === "partner" && product.variants.some((variant) => (variant.widthCm ?? 0) >= 140)) score += 4;
  if (intent.sleepMode === "solo" && product.variants.some((variant) => (variant.widthCm ?? 0) <= 100)) score += 4;
  if (intent.pillowTechnology && product.pillowTechnology === intent.pillowTechnology) score += 8;

  const tokens = intent.normalizedQuery.split(/\s+/).filter(Boolean);
  score += tokens.filter((token) => text.includes(token)).length;
  score += getAvailabilityPriority(product);

  return score;
}

function attachSelectedVariant(product, measure) {
  const selectedVariant =
    (measure ? product.variants.find((variant) => variant.measureCode === measure) : null) ??
    product.variants[0] ??
    null;
  return selectedVariant
    ? {
        ...product,
        selectedMeasureCode: selectedVariant.measureCode ?? null,
        selectedVariant,
      }
    : product;
}

export function searchProductsByIntent(products = [], query = "") {
  const intent = parseSearchIntent(query);
  const enriched = products.map((product) => enrichProductForSleepIntent(product));
  const ranked = enriched
    .map((product) => ({
      product: attachSelectedVariant(product, intent.measure),
      score: scoreProductAgainstIntent(product, intent),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) return scoreDelta;
      const leftMeasureMatch = intent.measure && left.product.selectedMeasureCode === intent.measure ? 1 : 0;
      const rightMeasureMatch = intent.measure && right.product.selectedMeasureCode === intent.measure ? 1 : 0;
      if (rightMeasureMatch !== leftMeasureMatch) return rightMeasureMatch - leftMeasureMatch;
      return (right.product.selectedVariant?.price ?? 0) - (left.product.selectedVariant?.price ?? 0);
    });

  return {
    parsedIntent: intent,
    results: ranked.map((entry) => entry.product),
    relatedCategories: ranked.length ? [] : DEFAULT_RELATED_CATEGORIES,
    measureWarning: intent.measureWarning,
  };
}
