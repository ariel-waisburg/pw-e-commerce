import {
  AVAILABILITY_OPTIONS,
  FIRMNESS_OPTIONS,
  SLEEP_MODE_OPTIONS,
  SLEEP_POSITION_OPTIONS,
  enrichProductsForSleepIntent,
  formatCatalogMeasureLabel,
  getBudgetRangeBounds,
  getBudgetRangeLabel,
  getMeasureGuide,
  getZeroResultsGuidance,
  getSelectedVariantForSleepIntent,
  hasBudgetRange,
  normalizeBudgetRange,
  parseMeasureSelection,
  recommendMattress,
  scoreSleepIntentProduct,
} from "./sleep-intent.mjs";
import { applyVariantFiltersToProduct, collectCatalogFilterOptions, filterCatalogProducts } from "./catalog.mjs";
import { searchProductsByIntent } from "./search-intent.mjs";

const LEGACY_TYPE_TO_SALE_TYPE = {
  colchon: "mattress",
  conjunto: "set",
};

const CATEGORY_LABELS = {
  almohadas: "Almohadas",
  pillow: "Pillow Top",
};

const FILTER_LABELS = {
  saleType: {
    mattress: "Solo colchón",
    set: "Colchón + base",
  },
  technology: {
    foam: "Espuma",
    bonell: "Resortes tradicionales",
    pocket: "Resortes pocket",
  },
  motionIsolation: {
    high: "Aislación alta",
    medium: "Aislación media",
    low: "Aislación baja",
  },
  availability: Object.fromEntries(AVAILABILITY_OPTIONS.map((option) => [option.value, option.label])),
  firmness: Object.fromEntries(FIRMNESS_OPTIONS.map((option) => [option.value, option.label])),
  sleepMode: Object.fromEntries(SLEEP_MODE_OPTIONS.map((option) => [option.value, option.label])),
  sleepPosition: Object.fromEntries(SLEEP_POSITION_OPTIONS.map((option) => [option.value, option.label])),
};

const URL_KEYS = [
  "q",
  "measure",
  "budgetMin",
  "budgetMax",
  "firmness",
  "sleepPosition",
  "sleepMode",
  "technology",
  "motionIsolation",
  "heightProfile",
  "availability",
  "saleType",
  "category",
];

function getSingleValue(searchParams, key) {
  const value = searchParams?.[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getMeasureStateValue(value) {
  const parsed = parseMeasureSelection(value);
  return {
    rawMeasure: value ?? null,
    measure: parsed.measureCode ?? null,
    measureWarning: parsed.warning,
  };
}

function buildChip(key, value, label, kind = "filter") {
  return { key, value, label, kind };
}

function getChipLabel(key, value) {
  if (!value) return null;
  if (key === "measure") return formatCatalogMeasureLabel(value) ?? value;
  if (key === "category") return CATEGORY_LABELS[value] ?? value;
  if (FILTER_LABELS[key]) return FILTER_LABELS[key][value] ?? value;
  return value;
}

function buildBudgetChip(state, kind = "selector") {
  const label = getBudgetRangeLabel({
    min: state.budgetMin,
    max: state.budgetMax,
  });

  if (!label) return null;

  return buildChip("budget", `${state.budgetMin ?? ""}-${state.budgetMax ?? ""}`, label, kind);
}

function buildSelectorChips(state = {}) {
  const chips = ["measure", "firmness", "sleepPosition", "sleepMode"]
    .map((key) => {
      const value = key === "measure" ? state.measure : state[key];
      return value ? buildChip(key, value, getChipLabel(key, value), "selector") : null;
    })
    .filter(Boolean);

  const budgetChip = buildBudgetChip(state);
  if (budgetChip) {
    chips.splice(1, 0, budgetChip);
  }

  return chips;
}

function hasSelectorAnswers(state = {}) {
  return Boolean(
    state.measure ||
      state.firmness ||
      state.sleepPosition ||
      state.sleepMode ||
      hasBudgetRange({ min: state.budgetMin, max: state.budgetMax })
  );
}

function sortProductsBySelectorIntent(products = [], state = {}) {
  if (!hasSelectorAnswers(state)) {
    return products;
  }

  return products
    .map((product) => {
      const selectedProduct = getSelectedVariantForSleepIntent(product, state);
      const selectedVariant = selectedProduct?.selectedVariant ?? product.variants?.[0] ?? null;

      return {
        product: selectedVariant
          ? {
              ...product,
              defaultVariantId: selectedVariant.id ?? product.defaultVariantId,
            }
          : product,
        score: scoreSleepIntentProduct(product, state, selectedVariant),
        price: selectedVariant?.price ?? Number.POSITIVE_INFINITY,
      };
    })
    .sort((left, right) => right.score - left.score || left.price - right.price)
    .map((entry) => entry.product);
}

export function getCatalogStateFromSearchParams(searchParams = {}) {
  const legacyType = getSingleValue(searchParams, "type");
  const saleType = getSingleValue(searchParams, "saleType") ?? (legacyType ? LEGACY_TYPE_TO_SALE_TYPE[legacyType] ?? null : null);
  const category = getSingleValue(searchParams, "category");
  const measureState = getMeasureStateValue(getSingleValue(searchParams, "measure"));
  const budgetRange = normalizeBudgetRange({
    budgetMin: getSingleValue(searchParams, "budgetMin"),
    budgetMax: getSingleValue(searchParams, "budgetMax"),
    budget: getSingleValue(searchParams, "budget"),
  });

  return {
    q: getSingleValue(searchParams, "q") ?? "",
    saleType,
    category,
    budgetMin: budgetRange.min,
    budgetMax: budgetRange.max,
    firmness: getSingleValue(searchParams, "firmness"),
    sleepPosition: getSingleValue(searchParams, "sleepPosition"),
    sleepMode: getSingleValue(searchParams, "sleepMode"),
    technology: getSingleValue(searchParams, "technology") ?? getSingleValue(searchParams, "coreTechnology"),
    motionIsolation: getSingleValue(searchParams, "motionIsolation"),
    heightProfile: getSingleValue(searchParams, "heightProfile"),
    availability: getSingleValue(searchParams, "availability"),
    ...measureState,
  };
}

export function serializeCatalogState(state = {}) {
  const params = new URLSearchParams();

  URL_KEYS.forEach((key) => {
    if (key === "measure") {
      const nextValue = state.rawMeasure ?? state.measure;
      if (nextValue) params.set("measure", nextValue);
      return;
    }

    const value = state[key];
    if (value != null && value !== "") params.set(key, value);
  });

  return params.toString();
}

export function buildCatalogStateHref(state = {}) {
  const query = serializeCatalogState(state);
  return query ? `/catalog?${query}` : "/catalog";
}

export function getPdpContextSummary(state = {}) {
  const selectorChips = [];
  const filterChips = [];

  ["measure", "budget", "firmness", "sleepPosition", "sleepMode"].forEach((key) => {
    if (key !== "budget") {
      const value = key === "measure" ? state.measure : state[key];
      if (!value) return;
      selectorChips.push(buildChip(key, value, getChipLabel(key, value), "selector"));
      return;
    }

    const budgetChip = buildBudgetChip(state);
    if (budgetChip) selectorChips.push(budgetChip);
  });

  ["saleType", "technology", "motionIsolation", "heightProfile", "availability", "category"].forEach((key) => {
    const value = state[key];
    if (!value) return;
    filterChips.push(buildChip(key, value, getChipLabel(key, value), "filter"));
  });

  return {
    selectorChips,
    filterChips,
    hasContext: selectorChips.length > 0 || filterChips.length > 0,
  };
}

export function buildCatalogDiscoveryModel(products = [], searchParams = {}) {
  const state = getCatalogStateFromSearchParams(searchParams);
  const allProducts = enrichProductsForSleepIntent(products);
  const searchResult = state.q ? searchProductsByIntent(allProducts, state.q) : null;
  const effectiveCategory = state.category ?? searchResult?.parsedIntent?.category ?? null;
  const effectiveSaleType = state.saleType ?? searchResult?.parsedIntent?.saleType ?? null;
  const effectiveState = {
    ...state,
    category: effectiveCategory,
    saleType: effectiveSaleType,
  };
  const isAccessoryMode = Boolean(effectiveCategory && ["almohadas", "pillow"].includes(effectiveCategory));
  const coreProducts = allProducts.filter((product) => product.saleType);
  const accessoryProducts = allProducts.filter((product) => !product.saleType);
  const searchedProducts = searchResult?.results ?? (isAccessoryMode ? accessoryProducts : coreProducts);
  const relevantProducts = isAccessoryMode
    ? searchedProducts.filter((product) => product.category === effectiveCategory)
    : searchedProducts.filter((product) => product.saleType);

  const filteredProducts = isAccessoryMode
    ? relevantProducts
    : filterCatalogProducts(relevantProducts, effectiveState).map((product) =>
        applyVariantFiltersToProduct(product, effectiveState)
      );
  const visibleProducts = isAccessoryMode
    ? filteredProducts
    : sortProductsBySelectorIntent(filteredProducts, effectiveState);

  const filterOptions = collectCatalogFilterOptions(coreProducts);
  const recommendation =
    !isAccessoryMode &&
    hasSelectorAnswers(state)
      ? recommendMattress(coreProducts, effectiveState)
      : null;

  const activeSelectorChips = buildSelectorChips(effectiveState);

  const activeFilterChips = ["saleType", "technology", "motionIsolation", "heightProfile", "availability", "category"]
    .map((key) => {
      const value = effectiveState[key];
      return value ? buildChip(key, value, getChipLabel(key, value), "filter") : null;
    })
    .filter(Boolean);

  const zeroResultsGuidance =
    filteredProducts.length === 0
      ? getZeroResultsGuidance({
          activeFilters: {
            measure: state.rawMeasure ?? state.measure,
            budgetMin: effectiveState.budgetMin,
            budgetMax: effectiveState.budgetMax,
            firmness: effectiveState.firmness,
            technology: effectiveState.technology,
            motionIsolation: effectiveState.motionIsolation,
            heightProfile: effectiveState.heightProfile,
            availability: effectiveState.availability,
            sleepMode: effectiveState.sleepMode,
            saleType: effectiveState.saleType,
          },
          products: relevantProducts,
        })
      : null;

  return {
    state: effectiveState,
    filterOptions,
    visibleProducts,
    recommendation,
    zeroResultsGuidance,
    measureGuide: getMeasureGuide(),
    budgetBounds: getBudgetRangeBounds(coreProducts),
    measureWarning: effectiveState.measureWarning ?? searchResult?.measureWarning ?? null,
    resultCount: visibleProducts.length,
    relatedCategories: visibleProducts.length === 0 ? searchResult?.relatedCategories ?? [] : [],
    activeSelectorChips,
    activeFilterChips,
    isAccessoryMode,
  };
}

export function removeCatalogStateKey(state, key) {
  if (key === "measure") {
    return {
      ...state,
      measure: null,
      rawMeasure: null,
      measureWarning: null,
    };
  }

  if (key === "budget") {
    return {
      ...state,
      budgetMin: null,
      budgetMax: null,
    };
  }

  return {
    ...state,
    [key]: null,
  };
}

export function clearCatalogState(state = {}) {
  return {
    ...state,
    q: "",
    saleType: null,
    category: null,
    budgetMin: null,
    budgetMax: null,
    firmness: null,
    sleepPosition: null,
    sleepMode: null,
    technology: null,
    motionIsolation: null,
    heightProfile: null,
    availability: null,
    measure: null,
    rawMeasure: null,
    measureWarning: null,
  };
}

export function getZeroResultsHref(state, guidance) {
  if (!guidance) return buildCatalogStateHref(state);

  if (guidance.kind === "remove_filter") {
    return buildCatalogStateHref(removeCatalogStateKey(state, guidance.filterKey));
  }

  if (guidance.kind === "suggest_measure") {
    return buildCatalogStateHref({
      ...state,
      measure: guidance.suggestedMeasureCode,
      rawMeasure: guidance.suggestedMeasureCode,
      measureWarning: null,
    });
  }

  return buildCatalogStateHref(state);
}
