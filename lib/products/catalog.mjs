import {
  FABRIC_LABELS,
  FABRIC_ORDER,
  HEIGHT_PROFILE_LABELS,
  HEIGHT_PROFILE_ORDER,
  LINE_DEFINITIONS,
  LINE_LABELS,
  LINE_ORDER,
  PILLOW_TECHNOLOGY_LABELS,
  PILLOW_TYPE_LABELS,
  PILLOW_TYPE_ORDER,
  SALE_TYPE_LABELS,
  SALE_TYPE_ORDER,
  TECHNOLOGY_LABELS,
  TECHNOLOGY_ORDER,
} from "./catalog-config.mjs";
import {
  AVAILABILITY_OPTIONS,
  BUDGET_DEFINITIONS,
  FIRMNESS_OPTIONS,
  MOTION_ISOLATION_OPTIONS,
  SLEEP_MODE_OPTIONS,
  enrichProductForSleepIntent,
  formatCatalogMeasureLabel,
  isPriceWithinBudgetRange,
  isSleepModeEligible,
  normalizeBudgetRange,
} from "./sleep-intent.mjs";

export const CANONICAL_MEASURE_CODES = [
  "080x190",
  "100x190",
  "100x200",
  "130x190",
  "140x190",
  "150x190",
  "160x200",
  "180x200",
  "200x200",
];

const MEASURE_TO_VISIBLE_PLAZA = {
  "080x190": "1 plaza",
  "100x190": "1 plaza",
  "100x200": "1 plaza",
  "130x190": "2 plazas",
  "140x190": "2 plazas",
  "150x190": "2 plazas",
  "160x200": "queen",
  "180x200": "king",
  "200x200": "king",
};

const PLAZA_ORDER = ["1 plaza", "2 plazas", "queen", "king"];
const LINE_LOOKUP = Object.fromEntries(LINE_DEFINITIONS.map((line) => [line.value, line]));

function stripAccents(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toComparable(value = "") {
  return stripAccents(String(value)).trim().toLowerCase();
}

function titleCase(value = "") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sortByConfiguredOrder(values, order) {
  return [...values].sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

function buildOption(value, label) {
  return { value, label };
}

function formatVisiblePlaza(plaza) {
  if (!plaza) return "";
  if (plaza === "queen" || plaza === "king") {
    return plaza.charAt(0).toUpperCase() + plaza.slice(1);
  }
  return titleCase(plaza);
}

function inferSaleType({ saleType, type, category, name }) {
  if (saleType) return saleType;
  const comparable = `${toComparable(type)} ${toComparable(category)} ${toComparable(name)}`;
  if (comparable.includes("conjunto")) return "set";
  if (comparable.includes("colchon")) return "mattress";
  return null;
}

function inferLine({ line, lineFamily, metadata, name }) {
  const direct = line ?? lineFamily ?? metadata?.line ?? metadata?.line_family ?? null;
  if (direct) {
    const match = LINE_DEFINITIONS.find((item) => toComparable(item.value) === toComparable(direct));
    if (match) return match.value;
  }

  const comparable = `${toComparable(name)} ${toComparable(direct)}`;
  return LINE_DEFINITIONS.find((item) => comparable.includes(toComparable(item.value)))?.value ?? null;
}

function inferTechnology({ technology, coreTechnology, metadata, attributes, name, description }) {
  const direct = technology ?? coreTechnology ?? metadata?.technology ?? metadata?.core_technology ?? attributes?.technology;
  if (direct) {
    const normalized = toComparable(direct);
    if (normalized.includes("pocket")) return "pocket";
    if (normalized.includes("bonell") || normalized.includes("bonnel")) return "bonell";
    if (normalized.includes("foam") || normalized.includes("espuma")) return "foam";
    if (normalized.includes("mid")) return "pocket";
    if (normalized.includes("plush")) return "bonell";
    if (normalized.includes("firm")) return "foam";
  }

  const comparable = [technology, coreTechnology, metadata?.technology, name, description]
    .map((value) => toComparable(value))
    .join(" ");
  const tokens = comparable.split(/\s+/).filter(Boolean);

  if (comparable.includes("pocket")) return "pocket";
  if (tokens.includes("mid")) return "pocket";
  if (comparable.includes("bonell") || comparable.includes("bonnel") || comparable.includes("plush")) return "bonell";
  if (comparable.includes("foam") || comparable.includes("espuma") || comparable.includes("firm")) return "foam";
  return null;
}

function inferDisplayName({ displayName, modelName, commercialAlias, metadata, line, technology, name }) {
  if (displayName || modelName || commercialAlias || metadata?.display_name || metadata?.model_name) {
    return displayName ?? modelName ?? commercialAlias ?? metadata?.display_name ?? metadata?.model_name;
  }

  const lineDefinition = line ? LINE_LOOKUP[line] : null;
  const nameComparable = toComparable(name);
  const directMatch = Object.values(lineDefinition?.displayNameByTechnology ?? {}).find((candidate) =>
    nameComparable.includes(toComparable(candidate))
  );

  if (directMatch) return directMatch;
  return lineDefinition?.displayNameByTechnology?.[technology] ?? null;
}

function normalizeMeasureFromVariant(variant = {}) {
  return (
    normalizeMeasureCode(variant.measureCode) ??
    normalizeMeasureCode(variant.metadata?.measure_code) ??
    normalizeMeasureCode(
      variant.dimensions?.measure_code ||
        (variant.dimensions?.width_cm && variant.dimensions?.length_cm
          ? `${variant.dimensions.width_cm}x${variant.dimensions.length_cm}`
          : null)
    ) ??
    normalizeMeasureCode(variant.title)
  );
}

function getDimensionsFromVariant(variant = {}, measureCode) {
  const normalizedMeasure = normalizeMeasureCode(measureCode);
  const [widthFromMeasure, lengthFromMeasure] =
    normalizedMeasure?.split("x").map((value) => Number.parseInt(value, 10)) ?? [];

  return {
    widthCm: variant.widthCm ?? variant.dimensions?.width_cm ?? widthFromMeasure ?? null,
    lengthCm: variant.lengthCm ?? variant.dimensions?.length_cm ?? lengthFromMeasure ?? null,
    heightCm: variant.heightCm ?? variant.dimensions?.height_cm ?? null,
  };
}

export function normalizeMeasureCode(value) {
  if (!value) return null;

  const digits = String(value).match(/(\d{2,3})\D+(\d{3})/);
  if (!digits) return null;

  const width = digits[1].padStart(3, "0");
  const length = digits[2];
  const code = `${width}x${length}`;

  return CANONICAL_MEASURE_CODES.includes(code) ? code : null;
}

export function getVisiblePlazaFromMeasure(measureCode) {
  const normalized = normalizeMeasureCode(measureCode);
  return normalized ? MEASURE_TO_VISIBLE_PLAZA[normalized] ?? null : null;
}

export function getPlazaFromMeasure(measureCode) {
  return getVisiblePlazaFromMeasure(measureCode);
}

export function formatMeasureLabel(measureCode) {
  const normalized = normalizeMeasureCode(measureCode);
  if (!normalized) return "";
  const [width, length] = normalized.split("x");
  return `${width} x ${length} cm`;
}

export { formatCatalogMeasureLabel };

export function formatVariantLabel({ measureCode, plaza } = {}) {
  const normalizedMeasure = normalizeMeasureCode(measureCode);
  const visiblePlaza = plaza ?? getVisiblePlazaFromMeasure(normalizedMeasure);
  const measureLabel = formatMeasureLabel(normalizedMeasure);

  if (!measureLabel) return visiblePlaza ? formatVisiblePlaza(visiblePlaza) : "";
  if (!visiblePlaza) return measureLabel;

  return `${formatVisiblePlaza(visiblePlaza)} · ${measureLabel}`;
}

export function getSetSplitForMeasure(measureCode) {
  const normalized = normalizeMeasureCode(measureCode);
  if (!normalized) return null;

  const [width] = normalized.split("x").map((value) => Number.parseInt(value, 10));
  if (width < 160) {
    return {
      baseCount: 1,
      widthsCm: [width],
      label: `1 sommier de ${width} cm`,
    };
  }

  const half = width / 2;
  return {
    baseCount: 2,
    widthsCm: [half, half],
    label: `2 sommiers de ${half} cm`,
  };
}

function getDerivedLineAttributes(line, technology) {
  const definition = line ? LINE_LOOKUP[line] : null;
  if (!definition) {
    return {
      pillowType: null,
      heightCm: null,
      heightProfile: null,
      topFabric: null,
      sideFabric: null,
      displayName: null,
      isTechnologyAllowed: true,
    };
  }

  return {
    pillowType: definition.pillowByTechnology[technology] ?? null,
    heightCm: definition.heightCm ?? null,
    heightProfile: definition.heightProfile ?? null,
    topFabric: definition.topFabric ?? null,
    sideFabric: definition.sideFabric ?? null,
    displayName: definition.displayNameByTechnology[technology] ?? null,
    isTechnologyAllowed: definition.allowedTechnologies.includes(technology),
  };
}

export function normalizeCatalogProduct(product = {}) {
  const saleType = inferSaleType(product);
  const line = inferLine(product);
  const inferredTechnology = inferTechnology(product);
  const lineDefinition = line ? LINE_LOOKUP[line] : null;
  const technology =
    inferredTechnology ??
    (lineDefinition?.allowedTechnologies?.length === 1 ? lineDefinition.allowedTechnologies[0] : null);
  const derived = getDerivedLineAttributes(line, technology);
  const displayName = inferDisplayName({ ...product, line, technology }) ?? derived.displayName;

  const variants = (product.variants ?? []).map((variant, index) => {
    const measureCode = normalizeMeasureFromVariant(variant);
    const visiblePlaza = getVisiblePlazaFromMeasure(measureCode);
    const dimensions = getDimensionsFromVariant(variant, measureCode);

    return {
      ...variant,
      id: variant.id ?? `${product.id ?? product.slug ?? "product"}-variant-${index}`,
      title: variant.title ?? formatVariantLabel({ measureCode, plaza: visiblePlaza }) ?? "Medida a confirmar",
      label: formatVariantLabel({ measureCode, plaza: visiblePlaza }) || variant.title || "Medida a confirmar",
      measureCode,
      plaza: visiblePlaza,
      widthCm: dimensions.widthCm,
      lengthCm: dimensions.lengthCm,
      heightCm: variant.heightCm ?? dimensions.heightCm ?? derived.heightCm,
      setSplit: saleType === "set" ? getSetSplitForMeasure(measureCode) : null,
    };
  });

  const normalizedProduct = {
    ...product,
    saleType,
    saleTypeLabel: saleType ? SALE_TYPE_LABELS[saleType] ?? titleCase(saleType) : null,
    line,
    lineLabel: line ? LINE_LABELS[line] ?? line : null,
    technology,
    technologyLabel: technology ? TECHNOLOGY_LABELS[technology] ?? titleCase(technology) : null,
    displayName: displayName ?? null,
    legacyName: product.legacyName ?? product.metadata?.legacy_name ?? null,
    commercialAlias: product.commercialAlias ?? product.metadata?.commercial_alias ?? null,
    pillowType: derived.pillowType,
    pillowTypeLabel: derived.pillowType ? PILLOW_TYPE_LABELS[derived.pillowType] : null,
    heightCm: derived.heightCm,
    heightProfile: derived.heightProfile,
    heightProfileLabel: derived.heightProfile ? HEIGHT_PROFILE_LABELS[derived.heightProfile] : null,
    topFabric: derived.topFabric,
    topFabricLabel: derived.topFabric ? FABRIC_LABELS[derived.topFabric] : null,
    sideFabric: derived.sideFabric,
    sideFabricLabel: derived.sideFabric ? FABRIC_LABELS[derived.sideFabric] : null,
    isTechnologyAllowed: derived.isTechnologyAllowed,
    variants,
    measures: variants.map((variant) => variant.measureCode).filter(Boolean),
    plazas: [...new Set(variants.map((variant) => variant.plaza).filter(Boolean))],
  };

  return enrichProductForSleepIntent(normalizedProduct);
}

export function filterCatalogProducts(products = [], filters = {}) {
  const normalizedFilters = {
    saleType: filters.saleType ?? (filters.type === "colchon" ? "mattress" : filters.type === "conjunto" ? "set" : null),
    line: filters.line ?? filters.lineFamily ?? null,
    technology: filters.technology ?? filters.coreTechnology ?? null,
    pillowType: filters.pillowType ?? null,
    heightProfile: filters.heightProfile ?? null,
    topFabric: filters.topFabric ?? null,
    sideFabric: filters.sideFabric ?? null,
    firmness: filters.firmness ?? null,
    motionIsolation: filters.motionIsolation ?? null,
    budgetMin: filters.budgetMin ?? null,
    budgetMax: filters.budgetMax ?? null,
    budget: filters.budget ?? null,
    availability: filters.availability ?? null,
    sleepMode: filters.sleepMode ?? null,
    measure: normalizeMeasureCode(filters.measure),
    plaza: filters.plaza ? toComparable(filters.plaza) : null,
  };

  const budgetRange = normalizeBudgetRange(normalizedFilters);

  return products.filter((product) => {
    if (normalizedFilters.saleType && product.saleType !== normalizedFilters.saleType) return false;
    if (normalizedFilters.line && product.line !== normalizedFilters.line) return false;
    if (normalizedFilters.technology && product.technology !== normalizedFilters.technology) return false;
    if (normalizedFilters.pillowType && product.pillowType !== normalizedFilters.pillowType) return false;
    if (normalizedFilters.heightProfile && product.heightProfile !== normalizedFilters.heightProfile) return false;
    if (normalizedFilters.topFabric && product.topFabric !== normalizedFilters.topFabric) return false;
    if (normalizedFilters.sideFabric && product.sideFabric !== normalizedFilters.sideFabric) return false;
    if (normalizedFilters.firmness && product.firmness !== normalizedFilters.firmness) return false;
    if (normalizedFilters.motionIsolation && product.motionIsolation !== normalizedFilters.motionIsolation) return false;

    if (!product.variants.length) {
      const hasVariantLevelFilter = Boolean(
        normalizedFilters.measure ||
          normalizedFilters.plaza ||
          normalizedFilters.availability ||
          normalizedFilters.sleepMode ||
          budgetRange.min != null ||
          budgetRange.max != null
      );
      return !hasVariantLevelFilter;
    }

    return product.variants.some((variant) => {
      if (normalizedFilters.measure && variant.measureCode !== normalizedFilters.measure) return false;
      if (normalizedFilters.plaza && toComparable(variant.plaza) !== normalizedFilters.plaza) return false;
      if (!isPriceWithinBudgetRange(variant.price, budgetRange)) {
        return false;
      }
      if (normalizedFilters.availability && variant.availability !== normalizedFilters.availability) return false;
      if (!isSleepModeEligible(variant, normalizedFilters.sleepMode)) {
        return false;
      }
      return true;
    });
  });
}

export function applyVariantFiltersToProduct(product, filters = {}) {
  if (!product?.variants?.length) return product;

  const normalizedMeasure = normalizeMeasureCode(filters.measure);
  const normalizedPlaza = filters.plaza ? toComparable(filters.plaza) : null;
  const normalizedAvailability = filters.availability ?? null;
  const normalizedSleepMode = filters.sleepMode ?? null;
  const budgetRange = normalizeBudgetRange(filters);

  if (
    !normalizedMeasure &&
    !normalizedPlaza &&
    !normalizedAvailability &&
    !normalizedSleepMode &&
    budgetRange.min == null &&
    budgetRange.max == null
  ) {
    return product;
  }

  const visibleVariants = product.variants.filter((variant) => {
    if (normalizedMeasure && variant.measureCode !== normalizedMeasure) return false;
    if (normalizedPlaza && toComparable(variant.plaza) !== normalizedPlaza) return false;
    if (normalizedAvailability && variant.availability !== normalizedAvailability) return false;
    if (!isPriceWithinBudgetRange(variant.price, budgetRange)) {
      return false;
    }
    if (!isSleepModeEligible(variant, normalizedSleepMode)) {
      return false;
    }
    return true;
  });

  const nextVariants = visibleVariants.length ? visibleVariants : product.variants;

  return {
    ...product,
    variants: nextVariants,
    measures: nextVariants.map((variant) => variant.measureCode).filter(Boolean),
    plazas: [...new Set(nextVariants.map((variant) => variant.plaza).filter(Boolean))],
    defaultVariantId: nextVariants[0]?.id ?? product.defaultVariantId,
  };
}

export function groupVariantsByPlaza(variants = []) {
  const groups = variants.reduce((accumulator, variant) => {
    const plaza = variant.plaza ?? "sin-plaza";
    if (!accumulator.has(plaza)) {
      accumulator.set(plaza, {
        plaza,
        label: plaza === "sin-plaza" ? "Único" : formatVisiblePlaza(plaza),
        variants: [],
      });
    }

    accumulator.get(plaza).variants.push(variant);
    return accumulator;
  }, new Map());

  return sortByConfiguredOrder([...groups.keys()], [...PLAZA_ORDER, "sin-plaza"]).map((plaza) => groups.get(plaza));
}

export function collectCatalogFilterOptions(products = []) {
  const saleTypes = sortByConfiguredOrder(
    [...new Set(products.map((product) => product.saleType).filter(Boolean))],
    SALE_TYPE_ORDER
  ).map((value) => buildOption(value, SALE_TYPE_LABELS[value] ?? titleCase(value)));

  const lines = sortByConfiguredOrder(
    [...new Set(products.map((product) => product.line).filter(Boolean))],
    LINE_ORDER
  ).map((value) => buildOption(value, LINE_LABELS[value] ?? value));

  const technologies = sortByConfiguredOrder(
    [...new Set(products.map((product) => product.technology).filter(Boolean))],
    TECHNOLOGY_ORDER
  ).map((value) => buildOption(value, TECHNOLOGY_LABELS[value] ?? titleCase(value)));

  const pillowTypes = sortByConfiguredOrder(
    [...new Set(products.map((product) => product.pillowType).filter(Boolean))],
    PILLOW_TYPE_ORDER
  ).map((value) => buildOption(value, PILLOW_TYPE_LABELS[value] ?? titleCase(value)));

  const heightProfiles = sortByConfiguredOrder(
    [...new Set(products.map((product) => product.heightProfile).filter(Boolean))],
    HEIGHT_PROFILE_ORDER
  ).map((value) => buildOption(value, HEIGHT_PROFILE_LABELS[value] ?? titleCase(value)));

  const topFabrics = sortByConfiguredOrder(
    [...new Set(products.map((product) => product.topFabric).filter(Boolean))],
    FABRIC_ORDER
  ).map((value) => buildOption(value, FABRIC_LABELS[value] ?? titleCase(value)));

  const sideFabrics = sortByConfiguredOrder(
    [...new Set(products.map((product) => product.sideFabric).filter(Boolean))],
    FABRIC_ORDER
  ).map((value) => buildOption(value, FABRIC_LABELS[value] ?? titleCase(value)));

  const measures = sortByConfiguredOrder(
    [...new Set(products.flatMap((product) => product.variants.map((variant) => variant.measureCode)).filter(Boolean))],
    CANONICAL_MEASURE_CODES
  ).map((value) => buildOption(value, formatCatalogMeasureLabel(value) ?? formatMeasureLabel(value)));

  const plazas = sortByConfiguredOrder(
    [...new Set(products.flatMap((product) => product.variants.map((variant) => variant.plaza)).filter(Boolean))],
    PLAZA_ORDER
  ).map((value) => buildOption(value, formatVisiblePlaza(value)));

  const budgets = BUDGET_DEFINITIONS.filter((definition) =>
    products.some((product) => product.budgetBands?.includes(definition.value))
  ).map((definition) => buildOption(definition.value, definition.label));

  const firmnesses = FIRMNESS_OPTIONS.filter((definition) =>
    products.some((product) => product.firmness === definition.value)
  ).map((definition) => buildOption(definition.value, definition.label));

  const motionIsolationLevels = MOTION_ISOLATION_OPTIONS.filter((definition) =>
    products.some((product) => product.motionIsolation === definition.value)
  ).map((definition) => buildOption(definition.value, definition.label));

  const availability = AVAILABILITY_OPTIONS.filter((definition) =>
    products.some((product) => product.variants.some((variant) => variant.availability === definition.value))
  ).map((definition) => buildOption(definition.value, definition.label));

  const sleepModes = SLEEP_MODE_OPTIONS.filter((definition) =>
    products.some((product) => product.sleepModeFit?.includes(definition.value))
  ).map((definition) => buildOption(definition.value, definition.label));

  return {
    saleTypes,
    lines,
    technologies,
    pillowTypes,
    heightProfiles,
    topFabrics,
    sideFabrics,
    measures,
    plazas,
    budgets,
    firmnesses,
    motionIsolationLevels,
    availability,
    sleepModes,
    types: saleTypes,
  };
}

export function normalizePillowTechnology(value) {
  const comparable = toComparable(value);
  if (comparable.includes("julie")) return "julie_gray";
  if (comparable.includes("silic")) return "silicona";
  if (comparable.includes("visco")) return "viscoelastica";
  if (comparable.includes("fibra")) return "fibra";
  return null;
}

export function getPillowTechnologyLabel(value) {
  return value ? PILLOW_TECHNOLOGY_LABELS[value] ?? titleCase(value) : null;
}
