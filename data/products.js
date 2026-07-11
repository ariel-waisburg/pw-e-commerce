import {
  CANONICAL_MEASURE_CODES,
  formatVariantLabel,
  getVisiblePlazaFromMeasure,
  PLAZA_ORDER,
} from "../lib/products/catalog.mjs";
import { LINE_DEFINITIONS } from "../lib/products/catalog-config.mjs";

const SALE_TYPE_DEFINITIONS = {
  mattress: {
    category: "colchones",
    slugPrefix: "colchon",
    label: "Colchón",
  },
  set: {
    category: "conjuntos",
    slugPrefix: "conjunto",
    label: "Conjunto",
  },
};

const TECHNOLOGY_COPY = {
  foam: "espuma de alta densidad",
  bonell: "resortes bonell tradicionales",
  pocket: "resortes pocket individuales",
};

const LINE_MEASURE_CODES = {
  "Classic Rest": CANONICAL_MEASURE_CODES,
  "Classic Special": CANONICAL_MEASURE_CODES,
  "High Rest": CANONICAL_MEASURE_CODES,
  "Superior Rest": CANONICAL_MEASURE_CODES,
  "Top Hotel Rest": [
    "130x190",
    "140x190",
    "140x200",
    "150x190",
    "150x200",
    "160x190",
    "160x200",
    "180x200",
    "200x200",
  ],
};

const LINE_PRICE_BASE = {
  "Classic Rest": {
    mattress: 549999,
    set: 849999,
  },
  "Classic Special": {
    mattress: 619999,
    set: 919999,
  },
  "High Rest": {
    mattress: 839999,
    set: 1189999,
  },
  "Superior Rest": {
    mattress: 979999,
    set: 1369999,
  },
  "Top Hotel Rest": {
    mattress: 1299999,
    set: 1649999,
  },
};

const LINE_PRICE_STEP = {
  "Classic Rest": 22000,
  "Classic Special": 24000,
  "High Rest": 32000,
  "Superior Rest": 38000,
  "Top Hotel Rest": 46000,
};

const TECHNOLOGY_PRICE_OFFSET = {
  foam: 0,
  bonell: 50000,
  pocket: 120000,
};

const FEATURED_PRODUCT_KEYS = new Set([
  "mattress:Classic Rest:bonell",
  "mattress:High Rest:pocket",
  "mattress:Superior Rest:bonell",
  "mattress:Top Hotel Rest:pocket",
  "set:Classic Rest:bonell",
  "set:High Rest:pocket",
  "set:Top Hotel Rest:pocket",
]);

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildVariants({ productId, measureCodes, basePrice, priceStep, heightCm }) {
  return measureCodes.map((measureCode) => {
    const [widthCm, lengthCm] = measureCode.split("x").map((value) => Number.parseInt(value, 10));
    const plaza = getVisiblePlazaFromMeasure(measureCode);
    const plazaIndex = Math.max(PLAZA_ORDER.indexOf(plaza), 0);
    const price = basePrice + plazaIndex * priceStep;

    return {
      id: `${productId}-${measureCode}`,
      title: formatVariantLabel({ measureCode, plaza }),
      label: formatVariantLabel({ measureCode, plaza }),
      price,
      compareAtPrice: price * 2,
      measureCode,
      plaza,
      dimensions: {
        measure_code: measureCode,
        width_cm: widthCm,
        length_cm: lengthCm,
        height_cm: heightCm,
      },
      metadata: {
        measure_code: measureCode,
      },
    };
  });
}

function buildCoreProduct(lineDefinition, saleType, technology) {
  const saleTypeDefinition = SALE_TYPE_DEFINITIONS[saleType];
  const displayName = lineDefinition.displayNameByTechnology[technology];
  const technologyCopy = TECHNOLOGY_COPY[technology];
  const productId = `fallback-${saleType}-${slugify(lineDefinition.value)}-${technology}`;
  const isFeatured = FEATURED_PRODUCT_KEYS.has(`${saleType}:${lineDefinition.value}:${technology}`);
  const basePrice = LINE_PRICE_BASE[lineDefinition.value][saleType] + TECHNOLOGY_PRICE_OFFSET[technology];
  const priceStep = LINE_PRICE_STEP[lineDefinition.value] + (saleType === "set" ? 18000 : 0);

  return {
    id: productId,
    slug: `${saleTypeDefinition.slugPrefix}-${slugify(lineDefinition.value)}-${technology}`,
    name: `${saleTypeDefinition.label} ${lineDefinition.value} ${displayName}`,
    category: saleTypeDefinition.category,
    saleType,
    line: lineDefinition.value,
    technology,
    displayName,
    legacyName: displayName,
    commercialAlias: displayName,
    brand: "Sleep",
    description:
      saleType === "set"
        ? `Conjunto ${lineDefinition.value} con ${technologyCopy}, armado para comprar el descanso completo.`
        : `${saleTypeDefinition.label} ${lineDefinition.value} con ${technologyCopy} dentro de una línea pensada para comparar por comfort, altura y pillow.`,
    longDescription:
      saleType === "set"
        ? `${lineDefinition.value} combina posicionamiento comercial claro con atributos técnicos consistentes: tecnología, pillow, altura, telas y medida exacta.`
        : `${lineDefinition.value} se ordena por línea y tecnología, pero sigue mostrando el naming comercial histórico para no perder reconocimiento en venta.`,
    tags: isFeatured ? ["destacado", "envio gratis"] : ["envio gratis"],
    isFeatured,
    variants: buildVariants({
      productId,
      measureCodes: LINE_MEASURE_CODES[lineDefinition.value],
      basePrice,
      priceStep,
      heightCm: lineDefinition.heightCm,
    }),
  };
}

const coreProducts = LINE_DEFINITIONS.flatMap((lineDefinition) =>
  Object.keys(SALE_TYPE_DEFINITIONS).flatMap((saleType) =>
    lineDefinition.allowedTechnologies.map((technology) => buildCoreProduct(lineDefinition, saleType, technology))
  )
);

const pillowProducts = [
  {
    id: "fallback-almohada-julie-gray",
    slug: "almohada-julie-gray",
    name: "Almohada Julie Gray",
    category: "almohadas",
    brand: "Sleep",
    description: "Opción económica para completar el descanso con soporte suave.",
    longDescription: "Julie Gray es la alternativa de entrada en almohadas Sleep. El tamaño queda preparado para definirse más adelante.",
    metadata: {
      pillow_technology: "julie_gray",
    },
    tags: ["economica"],
    variants: [
      {
        id: "fallback-almohada-julie-gray-unico",
        title: "Único",
        label: "Único",
        price: 39999,
        compareAtPrice: 59999,
      },
    ],
  },
  {
    id: "fallback-almohada-silicona",
    slug: "almohada-silicona",
    name: "Almohada Silicona",
    category: "almohadas",
    brand: "Sleep",
    description: "Almohada con esfera siliconada para una sensación mullida y flexible.",
    longDescription: "La línea Silicona se vende principalmente por tecnología y deja el tamaño como dato opcional para una etapa posterior.",
    metadata: {
      pillow_technology: "silicona",
    },
    tags: ["envio gratis"],
    variants: [
      {
        id: "fallback-almohada-silicona-unico",
        title: "Único",
        label: "Único",
        price: 54999,
        compareAtPrice: 79999,
      },
    ],
  },
  {
    id: "fallback-almohada-viscoelastica",
    slug: "almohada-viscoelastica",
    name: "Almohada Viscoelástica",
    category: "almohadas",
    brand: "Sleep",
    description: "Almohada viscoelástica premium con recuperación lenta.",
    longDescription: "Viscoelástica es la propuesta premium del eje almohadas y convive fuera del núcleo colchón/conjunto.",
    metadata: {
      pillow_technology: "viscoelastica",
    },
    tags: ["premium"],
    variants: [
      {
        id: "fallback-almohada-viscoelastica-unico",
        title: "Único",
        label: "Único",
        price: 89999,
        compareAtPrice: 129999,
      },
    ],
  },
  {
    id: "fallback-almohada-fibra",
    slug: "almohada-fibra",
    name: "Almohada Fibra",
    category: "almohadas",
    brand: "Sleep",
    description: "Almohada de fibra con soporte liviano y respirable.",
    longDescription: "Fibra completa la familia de almohadas con una lectura simple por tecnología.",
    metadata: {
      pillow_technology: "fibra",
    },
    tags: ["envio gratis"],
    variants: [
      {
        id: "fallback-almohada-fibra-unico",
        title: "Único",
        label: "Único",
        price: 46999,
        compareAtPrice: 69999,
      },
    ],
  },
];

const accessoryProducts = [
  {
    id: "fallback-pillow-top-top-hotel",
    slug: "pillow-top-top-hotel",
    name: "Pillow Top Top Hotel",
    category: "pillow",
    brand: "Sleep",
    description: "Capa extra de confort para sumar una sensación hotelera sobre el colchón.",
    longDescription: "El pillow top se mantiene fuera de la navegación principal, pero conserva una estructura de variantes por medida.",
    tags: ["premium"],
    variants: [
      {
        id: "fallback-pillow-top-top-hotel-160x200",
        title: "160 x 200 cm",
        label: "160 x 200 cm",
        price: 259999,
        compareAtPrice: 359999,
      },
      {
        id: "fallback-pillow-top-top-hotel-180x200",
        title: "180 x 200 cm",
        label: "180 x 200 cm",
        price: 289999,
        compareAtPrice: 399999,
      },
    ],
  },
];

const fallbackProducts = [...coreProducts];

export default fallbackProducts;
