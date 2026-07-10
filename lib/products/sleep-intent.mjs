function stripAccents(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toComparable(value = "") {
  return stripAccents(String(value)).trim().toLowerCase();
}

function normalizeLooseMeasureCode(value) {
  if (!value) return null;
  const digits = String(value).match(/(\d{2,3})\D+(\d{3})/);
  if (!digits) return null;
  return `${digits[1].padStart(3, "0")}x${digits[2]}`;
}

function formatBudgetPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseBudgetValue(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return null;

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export const SIZE_DEFINITIONS = [
  {
    measureCode: "080x190",
    name: "1 plaza",
    label: "1 plaza — 80 x 190 cm",
    aliases: ["80x190", "80 x 190", "1 plaza 80", "single 80"],
    relatedMeasureCodes: ["080x200", "090x190", "100x190"],
  },
  {
    measureCode: "080x200",
    name: "1 plaza extra largo",
    label: "1 plaza extra largo — 80 x 200 cm",
    aliases: ["80x200", "80 x 200", "1 plaza extra largo 80"],
    relatedMeasureCodes: ["080x190", "090x200", "100x200"],
  },
  {
    measureCode: "090x190",
    name: "1 plaza ancho",
    label: "1 plaza ancho — 90 x 190 cm",
    aliases: ["90x190", "90 x 190", "1 plaza 90"],
    relatedMeasureCodes: ["080x190", "090x200", "100x190"],
  },
  {
    measureCode: "090x200",
    name: "1 plaza ancho extra largo",
    label: "1 plaza ancho extra largo — 90 x 200 cm",
    aliases: ["90x200", "90 x 200"],
    relatedMeasureCodes: ["080x200", "090x190", "100x200"],
  },
  {
    measureCode: "100x190",
    name: "1 plaza y media",
    label: "1 plaza y media — 100 x 190 cm",
    aliases: ["100x190", "100 x 190", "1 plaza y media", "plaza y media", "una plaza y media"],
    relatedMeasureCodes: ["090x190", "100x200", "105x190"],
  },
  {
    measureCode: "100x200",
    name: "1 plaza y media extra largo",
    label: "1 plaza y media extra largo — 100 x 200 cm",
    aliases: ["100x200", "100 x 200", "1 plaza y media extra largo", "extra largo"],
    relatedMeasureCodes: ["100x190", "105x200", "090x200"],
  },
  {
    measureCode: "105x190",
    name: "1 plaza y media ancho",
    label: "1 plaza y media ancho — 105 x 190 cm",
    aliases: ["105x190", "105 x 190"],
    relatedMeasureCodes: ["100x190", "105x200", "130x190"],
  },
  {
    measureCode: "105x200",
    name: "1 plaza y media ancho extra largo",
    label: "1 plaza y media ancho extra largo — 105 x 200 cm",
    aliases: ["105x200", "105 x 200"],
    relatedMeasureCodes: ["100x200", "105x190", "140x200"],
  },
  {
    measureCode: "130x190",
    name: "2 plazas",
    label: "2 plazas — 130 x 190 cm",
    aliases: ["130x190", "130 x 190", "2 plazas angosto"],
    relatedMeasureCodes: ["105x190", "140x190"],
  },
  {
    measureCode: "140x190",
    name: "2 plazas",
    label: "2 plazas — 140 x 190 cm",
    aliases: ["140x190", "140 x 190", "2 plazas", "matrimonial"],
    relatedMeasureCodes: ["130x190", "140x200", "150x190"],
  },
  {
    measureCode: "140x200",
    name: "2 plazas extra largo",
    label: "2 plazas extra largo — 140 x 200 cm",
    aliases: ["140x200", "140 x 200", "2 plazas extra largo"],
    relatedMeasureCodes: ["140x190", "105x200", "150x200"],
  },
  {
    measureCode: "150x190",
    name: "Queen",
    label: "Queen — 150 x 190 cm",
    aliases: ["150x190", "150 x 190"],
    relatedMeasureCodes: ["140x190", "150x200", "160x190"],
  },
  {
    measureCode: "150x200",
    name: "Queen extra largo",
    label: "Queen extra largo — 150 x 200 cm",
    aliases: ["150x200", "150 x 200"],
    relatedMeasureCodes: ["150x190", "160x200", "140x200"],
  },
  {
    measureCode: "160x190",
    name: "Queen",
    label: "Queen — 160 x 190 cm",
    aliases: ["160x190", "160 x 190"],
    relatedMeasureCodes: ["150x190", "160x200"],
  },
  {
    measureCode: "160x200",
    name: "Queen",
    label: "Queen — 160 x 200 cm",
    aliases: ["160x200", "160 x 200", "queen", "queen size"],
    relatedMeasureCodes: ["150x200", "180x200", "160x190"],
  },
  {
    measureCode: "180x200",
    name: "King",
    label: "King — 180 x 200 cm",
    aliases: ["180x200", "180 x 200", "king", "king size"],
    relatedMeasureCodes: ["160x200", "200x200"],
  },
  {
    measureCode: "200x200",
    name: "King",
    label: "King — 200 x 200 cm",
    aliases: ["200x200", "200 x 200", "super king", "superking"],
    relatedMeasureCodes: ["180x200"],
    confusionWith: ["200x190"],
  },
];

const SIZE_LOOKUP = Object.fromEntries(SIZE_DEFINITIONS.map((entry) => [entry.measureCode, entry]));

const ALIAS_LOOKUP = SIZE_DEFINITIONS.reduce((accumulator, definition) => {
  definition.aliases.forEach((alias) => {
    accumulator.set(toComparable(alias), definition.measureCode);
  });
  accumulator.set(toComparable(definition.label), definition.measureCode);
  accumulator.set(toComparable(definition.name), definition.measureCode);
  return accumulator;
}, new Map());

const CONFUSING_SIZE_SUGGESTIONS = {
  "200x190": "200x200",
};

export const BUDGET_DEFINITIONS = [
  {
    value: "hasta_700000",
    label: "Hasta $700.000",
    min: 0,
    max: 700000,
  },
  {
    value: "700000_1000000",
    label: "$700.000 a $1.000.000",
    min: 700001,
    max: 1000000,
  },
  {
    value: "1000000_1400000",
    label: "$1.000.000 a $1.400.000",
    min: 1000001,
    max: 1400000,
  },
  {
    value: "1400000_plus",
    label: "Más de $1.400.000",
    min: 1400001,
    max: Number.POSITIVE_INFINITY,
  },
];

export const FIRMNESS_OPTIONS = [
  { value: "soft", label: "Suave" },
  { value: "balanced", label: "Equilibrado" },
  { value: "firm", label: "Firme" },
];

export const SLEEP_POSITION_OPTIONS = [
  { value: "side", label: "De costado" },
  { value: "back", label: "Boca arriba" },
  { value: "stomach", label: "Boca abajo" },
  { value: "mixed", label: "Voy cambiando" },
];

export const SLEEP_MODE_OPTIONS = [
  { value: "solo", label: "Duermo solo/a" },
  { value: "partner", label: "Duermo con otra persona" },
];

export const MOTION_ISOLATION_OPTIONS = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

export const AVAILABILITY_OPTIONS = [
  { value: "available_now", label: "Disponible" },
  { value: "low_stock", label: "Últimas unidades" },
  { value: "backorder", label: "Con demora" },
];

export const FILTER_REMOVAL_PRIORITY = [
  "availability",
  "motionIsolation",
  "heightProfile",
  "budget",
  "firmness",
  "technology",
  "sleepMode",
  "saleType",
  "measure",
];

function getBudgetDefinition(value) {
  return BUDGET_DEFINITIONS.find((entry) => entry.value === value) ?? null;
}

export function getLegacyBudgetRange(value) {
  const definition = getBudgetDefinition(value);
  if (!definition) {
    return {
      min: null,
      max: null,
    };
  }

  return {
    min: definition.min > 0 ? definition.min : null,
    max: Number.isFinite(definition.max) ? definition.max : null,
  };
}

export function normalizeBudgetRange({ budgetMin = null, budgetMax = null, budget = null } = {}) {
  const legacyRange = budget ? getLegacyBudgetRange(budget) : { min: null, max: null };
  let min = parseBudgetValue(budgetMin ?? legacyRange.min);
  let max = parseBudgetValue(budgetMax ?? legacyRange.max);

  if (min != null && max != null && min > max) {
    [min, max] = [max, min];
  }

  return { min, max };
}

export function getBudgetRangeBounds(products = []) {
  const prices = products
    .flatMap((product) => product.variants ?? [])
    .map((variant) => variant.price)
    .filter((price) => typeof price === "number" && Number.isFinite(price));

  if (!prices.length) {
    return {
      min: 0,
      max: 0,
    };
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function hasBudgetRange({ min = null, max = null } = {}) {
  return min != null || max != null;
}

export function getBudgetRangeLabel({ min = null, max = null } = {}) {
  if (min != null && max != null) {
    return `Entre ${formatBudgetPrice(min)} y ${formatBudgetPrice(max)}`;
  }

  if (min != null) {
    return `Desde ${formatBudgetPrice(min)}`;
  }

  if (max != null) {
    return `Hasta ${formatBudgetPrice(max)}`;
  }

  return null;
}

function getMeasureDefinition(measureCode) {
  return measureCode ? SIZE_LOOKUP[measureCode] ?? null : null;
}

function getAvailabilityFromVariant(variant = {}) {
  const status = variant.stockStatus ?? variant.inventoryStatus ?? variant.inventory_status ?? "in_stock";
  const quantity = variant.stockQuantity ?? variant.stock_quantity ?? 0;

  if (status === "discontinued") return "unavailable";
  if (status === "backorder") return "backorder";
  if (status === "low_stock" || quantity > 0 && quantity <= 3) return "low_stock";
  if (status === "in_stock" || quantity > 0) return "available_now";
  return "backorder";
}

function getProductAvailability(variants = []) {
  const normalized = variants.map((variant) => variant.availability ?? getAvailabilityFromVariant(variant));
  if (normalized.includes("available_now")) return "available_now";
  if (normalized.includes("low_stock")) return "low_stock";
  if (normalized.includes("backorder")) return "backorder";
  return "unavailable";
}

function getFirmness(product = {}) {
  if (product.technology === "foam") return "firm";
  if (product.technology === "bonell") return "balanced";
  if (product.technology === "pocket") {
    if (["Superior Rest", "Top Hotel Rest"].includes(product.line)) return "soft";
    return "balanced";
  }
  return "balanced";
}

function getMotionIsolation(product = {}) {
  if (product.technology === "pocket") return "high";
  if (product.technology === "foam") return "medium";
  if (product.technology === "bonell") return "low";
  return "medium";
}

function getSleepModeFit(variants = []) {
  const fit = new Set();
  variants.forEach((variant) => {
    const width = variant.widthCm ?? Number.parseInt(String(variant.measureCode ?? "").split("x")[0] ?? "", 10);
    if (Number.isFinite(width) && width <= 100) fit.add("solo");
    if (Number.isFinite(width) && width >= 140) fit.add("partner");
  });
  return [...fit];
}

function getBudgetBands(variants = []) {
  const bands = new Set();
  variants.forEach((variant) => {
    const budget = getBudgetForPrice(variant.price);
    if (budget) bands.add(budget.value);
  });
  return [...bands];
}

function getBudgetForPrice(price) {
  if (typeof price !== "number") return null;
  return BUDGET_DEFINITIONS.find((budget) => price >= budget.min && price <= budget.max) ?? null;
}

function getComfortRank(product = {}) {
  const ranks = {
    "Classic Special": 0,
    "Classic Rest": 1,
    "High Rest": 2,
    "Superior Rest": 3,
    "Top Hotel Rest": 4,
  };
  return ranks[product.line] ?? 2;
}

function getDesiredComfortRank(firmness) {
  if (firmness === "firm") return 1;
  if (firmness === "soft") return 4;
  return 2;
}

function getPositionPreferredFirmness(position) {
  if (position === "side") return ["soft", "balanced"];
  if (position === "back") return ["balanced"];
  if (position === "stomach") return ["firm"];
  return ["balanced"];
}

function buildWhyItMatches({ product, measureDefinition, budgetDefinition, answers }) {
  const reasons = [];
  const firmnessLabel = FIRMNESS_OPTIONS.find((option) => option.value === product.firmness)?.label?.toLowerCase();
  const budgetLabel = getBudgetRangeLabel(normalizeBudgetRange(answers));

  if (firmnessLabel) {
    reasons.push(`ofrece una sensación ${firmnessLabel}`);
  }

  if (answers.sleepMode === "partner") {
    reasons.push(
      product.motionIsolation === "high"
        ? "ayuda a aislar mejor el movimiento al dormir en pareja"
        : "mantiene una base estable para dormir en pareja"
    );
  }

  if (measureDefinition) {
    reasons.push(`está disponible en ${measureDefinition.name.toLowerCase()}`);
  }

  if (budgetLabel) {
    reasons.push(`entra en el rango ${budgetLabel.toLowerCase()}`);
  } else if (budgetDefinition) {
    reasons.push(`se mantiene dentro del presupuesto ${budgetDefinition.label.toLowerCase()}`);
  }

  return `Te lo recomendamos porque ${reasons.join(", ")}.`;
}

function getRequestedMeasureCode(answers = {}) {
  const parsedMeasure = answers.measure ? parseMeasureSelection(answers.measure) : null;
  return parsedMeasure?.measureCode ?? normalizeLooseMeasureCode(answers.measure);
}

export function isPriceWithinBudgetRange(price, range = {}) {
  if (!hasBudgetRange(range)) return true;
  if (typeof price !== "number" || !Number.isFinite(price)) return false;
  if (range.min != null && price < range.min) return false;
  if (range.max != null && price > range.max) return false;
  return true;
}

export function isSleepModeEligible(variant, sleepMode) {
  if (!sleepMode) return true;
  const width = variant.widthCm ?? Number.parseInt(String(variant.measureCode ?? "").split("x")[0] ?? "", 10);
  if (!Number.isFinite(width)) return true;
  if (sleepMode === "partner") return width >= 140;
  if (sleepMode === "solo") return width <= 100;
  return true;
}

export function getSelectedVariantForSleepIntent(product, answers = {}) {
  const measureCode = getRequestedMeasureCode(answers);
  const budgetRange = normalizeBudgetRange(answers);
  const variants = [...(product.variants ?? [])];

  let candidates = measureCode
    ? variants.filter((variant) => variant.measureCode === measureCode)
    : variants;

  if (!candidates.length) {
    candidates = variants;
  }

  if (answers.sleepMode) {
    const sleepModeMatches = candidates.filter((variant) => isSleepModeEligible(variant, answers.sleepMode));
    if (sleepModeMatches.length) {
      candidates = sleepModeMatches;
    }
  }

  if (hasBudgetRange(budgetRange)) {
    const budgetMatches = candidates.filter((variant) => isPriceWithinBudgetRange(variant.price, budgetRange));
    if (budgetMatches.length) {
      candidates = budgetMatches;
    }
  }

  const selectedVariant = [...candidates].sort(
    (left, right) => (left.price ?? Number.POSITIVE_INFINITY) - (right.price ?? Number.POSITIVE_INFINITY)
  )[0] ?? null;

  if (!selectedVariant) return null;

  return {
    ...product,
    selectedVariant,
    selectedMeasureCode: selectedVariant.measureCode ?? measureCode ?? null,
  };
}

export function formatCatalogMeasureLabel(measureCode) {
  return getMeasureDefinition(measureCode)?.label ?? null;
}

export function getMeasureGuide() {
  return SIZE_DEFINITIONS;
}

export function parseMeasureSelection(value) {
  if (!value) {
    return { measureCode: null, matchedFromAlias: false, warning: null };
  }

  const comparable = toComparable(value);
  const exactAlias = ALIAS_LOOKUP.get(comparable);
  if (exactAlias) {
    return {
      measureCode: exactAlias,
      matchedFromAlias: true,
      warning: null,
    };
  }

  for (let index = SIZE_DEFINITIONS.length - 1; index >= 0; index -= 1) {
    const definition = SIZE_DEFINITIONS[index];
    if (
      [definition.label, definition.name, ...definition.aliases]
        .map((alias) => toComparable(alias))
        .some((alias) => comparable.includes(alias))
    ) {
      return {
        measureCode: definition.measureCode,
        matchedFromAlias: true,
        warning: null,
      };
    }
  }

  const looseMeasureCode = normalizeLooseMeasureCode(value);
  if (looseMeasureCode && SIZE_LOOKUP[looseMeasureCode]) {
    return {
      measureCode: looseMeasureCode,
      matchedFromAlias: comparable !== looseMeasureCode,
      warning: null,
    };
  }

  const suggestedMeasureCode = looseMeasureCode ? CONFUSING_SIZE_SUGGESTIONS[looseMeasureCode] ?? null : null;
  return {
    measureCode: null,
    matchedFromAlias: false,
    warning: suggestedMeasureCode
      ? {
          kind: "confusing_size",
          suggestedMeasureCode,
        }
      : null,
  };
}

export function getNearestMeasureSuggestion(rawMeasureCode, products = []) {
  if (!rawMeasureCode) return null;
  const loose = normalizeLooseMeasureCode(rawMeasureCode) ?? rawMeasureCode;
  const directSuggestion = CONFUSING_SIZE_SUGGESTIONS[loose];
  if (directSuggestion) return directSuggestion;

  const related = SIZE_DEFINITIONS.find((entry) => entry.relatedMeasureCodes.includes(loose));
  if (related) return related.measureCode;

  if (products.length) {
    const availableMeasures = new Set(
      products.flatMap((product) => product.variants?.map((variant) => variant.measureCode) ?? []).filter(Boolean)
    );
    const sameWidth = [...availableMeasures].find((measureCode) => measureCode.startsWith(loose.slice(0, 3)));
    if (sameWidth) return sameWidth;
  }

  return "160x200";
}

export function enrichProductForSleepIntent(product = {}) {
  const variants = (product.variants ?? []).map((variant) => {
    const measureCode = variant.measureCode ?? normalizeLooseMeasureCode(variant.label ?? variant.title);
    return {
      ...variant,
      measureCode,
      sizeLabel: formatCatalogMeasureLabel(measureCode) ?? variant.label ?? variant.title ?? "Medida a confirmar",
      availability: getAvailabilityFromVariant(variant),
    };
  });

  return {
    ...product,
    variants,
    firmness: getFirmness(product),
    motionIsolation: getMotionIsolation(product),
    availability: getProductAvailability(variants),
    sleepModeFit: getSleepModeFit(variants),
    budgetBands: getBudgetBands(variants),
    sizeLabels: variants.map((variant) => variant.sizeLabel).filter(Boolean),
    minPrice: variants.length ? Math.min(...variants.map((variant) => variant.price ?? Number.POSITIVE_INFINITY)) : null,
    maxPrice: variants.length ? Math.max(...variants.map((variant) => variant.price ?? 0)) : null,
  };
}

export function enrichProductsForSleepIntent(products = []) {
  return products.map((product) => enrichProductForSleepIntent(product));
}

function isBudgetEligible(price, answers = {}) {
  return isPriceWithinBudgetRange(price, normalizeBudgetRange(answers));
}

function getMotionIsolationScore(product, sleepMode) {
  if (sleepMode !== "partner") return 1;
  if (product.motionIsolation === "high") return 3;
  if (product.motionIsolation === "medium") return 2;
  return 0;
}

function getComfortProximityBonus(product, desiredFirmness) {
  const distance = Math.abs(getComfortRank(product) - getDesiredComfortRank(desiredFirmness));
  if (distance === 0) return 1;
  if (distance === 1) return 0.5;
  return 0;
}

export function scoreSleepIntentProduct(product, answers = {}, selectedVariant = null) {
  const variant = selectedVariant ?? getSelectedVariantForSleepIntent(product, answers)?.selectedVariant;
  if (!variant) return Number.NEGATIVE_INFINITY;

  let score = 0;

  if (answers.firmness && product.firmness === answers.firmness) {
    score += 4;
  }

  const positionMatches = getPositionPreferredFirmness(answers.sleepPosition);
  if (positionMatches.includes(product.firmness)) {
    score += 3;
  }

  score += getMotionIsolationScore(product, answers.sleepMode);

  if (isBudgetEligible(variant.price, answers)) {
    score += 2;
  }

  if (answers.firmness) {
    score += getComfortProximityBonus(product, answers.firmness);
  }

  if (answers.sleepMode && isSleepModeEligible(variant, answers.sleepMode)) {
    score += 1;
  }

  return score;
}

export function recommendMattress(products = [], answers = {}) {
  const measureCode = getRequestedMeasureCode(answers);
  const eligible = products
    .filter((product) => product.saleType === "mattress")
    .map((product) => enrichProductForSleepIntent(product))
    .map((product) => getSelectedVariantForSleepIntent(product, answers))
    .filter(Boolean)
    .filter((product) => !measureCode || product.selectedVariant?.measureCode === measureCode)
    .filter((product) => isBudgetEligible(product.selectedVariant?.price, answers))
    .filter((product) => isSleepModeEligible(product.selectedVariant, answers.sleepMode));

  if (!eligible.length) {
    return {
      primaryRecommendation: null,
      whyItMatches: "No encontramos una opción exacta con esas respuestas.",
      cheaperAlternative: null,
      premiumAlternative: null,
      disclaimer:
        "Esta sugerencia orienta la compra y no reemplaza consejo médico ni una evaluación profesional.",
    };
  }

  const ranked = eligible
    .map((product) => ({
      product,
      score: scoreSleepIntentProduct(product, answers, product.selectedVariant),
      price: product.selectedVariant?.price ?? Number.POSITIVE_INFINITY,
    }))
    .sort((left, right) => right.score - left.score || left.price - right.price);

  const primary = ranked[0]?.product ?? null;
  const sortedByPrice = [...ranked].sort((left, right) => left.price - right.price);
  const primaryIndex = sortedByPrice.findIndex((entry) => entry.product.id === primary?.id);
  const cheaper = primaryIndex > 0 ? sortedByPrice[primaryIndex - 1]?.product ?? null : null;
  const premium =
    primaryIndex >= 0 && primaryIndex < sortedByPrice.length - 1
      ? sortedByPrice[primaryIndex + 1]?.product ?? null
      : null;

  return {
    primaryRecommendation: primary,
    whyItMatches: buildWhyItMatches({
      product: primary,
      measureDefinition: getMeasureDefinition(primary?.selectedMeasureCode),
      budgetDefinition: getBudgetDefinition(answers.budget),
      answers,
    }),
    cheaperAlternative: cheaper,
    premiumAlternative: premium,
    disclaimer:
      "Esta sugerencia orienta la compra y no reemplaza consejo médico ni una evaluación profesional.",
  };
}

export function getZeroResultsGuidance({ activeFilters = {}, products = [] } = {}) {
  const budgetRange = normalizeBudgetRange(activeFilters);
  const activeEntries = Object.entries(activeFilters)
    .filter(([key, value]) => !["budget", "budgetMin", "budgetMax"].includes(key) && Boolean(value))
    .concat(hasBudgetRange(budgetRange) ? [["budget", getBudgetRangeLabel(budgetRange)]] : []);
  if (!activeEntries.length) return null;

  if (activeEntries.length === 1 && activeFilters.measure) {
    return {
      kind: "suggest_measure",
      currentMeasureCode: normalizeLooseMeasureCode(activeFilters.measure) ?? activeFilters.measure,
      suggestedMeasureCode: getNearestMeasureSuggestion(activeFilters.measure, products),
    };
  }

  const filterKey = FILTER_REMOVAL_PRIORITY.find((key) => Boolean(activeFilters[key])) ?? activeEntries[0][0];
  return {
    kind: "remove_filter",
    filterKey,
  };
}
