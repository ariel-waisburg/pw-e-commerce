export const SALE_TYPE_DEFINITIONS = [
  { value: "mattress", label: "Colchón" },
  { value: "set", label: "Conjunto" },
];

export const TECHNOLOGY_DEFINITIONS = [
  {
    value: "foam",
    label: "Espuma",
    summary: "Soporte firme y uniforme en toda la superficie.",
  },
  {
    value: "bonell",
    label: "Resortes Bonell",
    summary: "Respuesta elástica clásica con sensación más tradicional.",
  },
  {
    value: "pocket",
    label: "Resortes Pocket",
    summary: "Mejor independencia de movimiento y adaptación puntual.",
  },
];

export const PILLOW_TYPE_DEFINITIONS = [
  { value: "none", label: "Sin pillow" },
  { value: "euro", label: "Pillow europeo" },
  { value: "american", label: "Pillow americano" },
];

export const HEIGHT_PROFILE_DEFINITIONS = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "grande", label: "Grande" },
  { value: "muy_grande", label: "Muy grande" },
];

export const FABRIC_DEFINITIONS = [
  { value: "jacquard", label: "Jacquard" },
  { value: "knit", label: "Tejido de punto" },
  { value: "suede_like", label: "Gamuza / similar" },
];

export const PILLOW_TECHNOLOGY_DEFINITIONS = [
  { value: "julie_gray", label: "Julie Gray" },
  { value: "silicona", label: "Silicona" },
  { value: "viscoelastica", label: "Viscoelástica" },
  { value: "fibra", label: "Fibra" },
];

export const LINE_DEFINITIONS = [
  {
    value: "Classic Rest",
    label: "Classic Rest",
    summary: "La base noble de la línea Sleep para un descanso simple y rendidor.",
    comfortLabel: "Esencial",
    allowedTechnologies: ["bonell"],
    heightCm: 24,
    heightProfile: "media",
    topFabric: "jacquard",
    sideFabric: "jacquard",
    pillowByTechnology: {
      bonell: "none",
    },
    displayNameByTechnology: {
      bonell: "Rest",
    },
  },
  {
    value: "Classic Special",
    label: "Classic Special",
    summary: "Una opción liviana y directa para quien busca entrada de gama.",
    comfortLabel: "Inicial",
    allowedTechnologies: ["foam", "pocket"],
    heightCm: 20,
    heightProfile: "baja",
    topFabric: "jacquard",
    sideFabric: "jacquard",
    pillowByTechnology: {
      foam: "none",
      pocket: "none",
    },
    displayNameByTechnology: {
      foam: "Special Foam",
      pocket: "Special Pocket",
    },
  },
  {
    value: "High Rest",
    label: "High Rest",
    summary: "Más presencia, mejor terminación y una experiencia de comfort más equilibrada.",
    comfortLabel: "Equilibrado",
    allowedTechnologies: ["foam", "bonell", "pocket"],
    heightCm: 27,
    heightProfile: "media",
    topFabric: "knit",
    sideFabric: "jacquard",
    pillowByTechnology: {
      foam: "none",
      bonell: "euro",
      pocket: "euro",
    },
    displayNameByTechnology: {
      foam: "Foam",
      bonell: "Plush",
      pocket: "Pocket",
    },
  },
  {
    value: "Superior Rest",
    label: "Superior Rest",
    summary: "Mayor volumen, pillow americano y una sensación más envolvente y premium.",
    comfortLabel: "Premium",
    allowedTechnologies: ["foam", "bonell", "pocket"],
    heightCm: 32,
    heightProfile: "grande",
    topFabric: "knit",
    sideFabric: "jacquard",
    pillowByTechnology: {
      foam: "american",
      bonell: "american",
      pocket: "american",
    },
    displayNameByTechnology: {
      foam: "Mid",
      bonell: "Mid Plush",
      pocket: "Ultra Plush",
    },
  },
  {
    value: "Top Hotel Rest",
    label: "Top Hotel Rest",
    summary: "La propuesta más alta de la colección, con presencia hotelera y máximo confort.",
    comfortLabel: "Hotel",
    allowedTechnologies: ["pocket"],
    heightCm: 37,
    heightProfile: "muy_grande",
    topFabric: "knit",
    sideFabric: "suede_like",
    pillowByTechnology: {
      pocket: "american",
    },
    displayNameByTechnology: {
      pocket: "Top Hotel",
    },
  },
];

export const SALE_TYPE_LABELS = Object.fromEntries(
  SALE_TYPE_DEFINITIONS.map((item) => [item.value, item.label])
);

export const TECHNOLOGY_LABELS = Object.fromEntries(
  TECHNOLOGY_DEFINITIONS.map((item) => [item.value, item.label])
);

export const PILLOW_TYPE_LABELS = Object.fromEntries(
  PILLOW_TYPE_DEFINITIONS.map((item) => [item.value, item.label])
);

export const HEIGHT_PROFILE_LABELS = Object.fromEntries(
  HEIGHT_PROFILE_DEFINITIONS.map((item) => [item.value, item.label])
);

export const FABRIC_LABELS = Object.fromEntries(
  FABRIC_DEFINITIONS.map((item) => [item.value, item.label])
);

export const PILLOW_TECHNOLOGY_LABELS = Object.fromEntries(
  PILLOW_TECHNOLOGY_DEFINITIONS.map((item) => [item.value, item.label])
);

export const LINE_LABELS = Object.fromEntries(
  LINE_DEFINITIONS.map((item) => [item.value, item.label])
);

export const SALE_TYPE_ORDER = SALE_TYPE_DEFINITIONS.map((item) => item.value);
export const TECHNOLOGY_ORDER = TECHNOLOGY_DEFINITIONS.map((item) => item.value);
export const PILLOW_TYPE_ORDER = PILLOW_TYPE_DEFINITIONS.map((item) => item.value);
export const HEIGHT_PROFILE_ORDER = HEIGHT_PROFILE_DEFINITIONS.map((item) => item.value);
export const FABRIC_ORDER = FABRIC_DEFINITIONS.map((item) => item.value);
export const LINE_ORDER = LINE_DEFINITIONS.map((item) => item.value);
