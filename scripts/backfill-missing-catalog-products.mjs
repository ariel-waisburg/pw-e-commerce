import fs from "node:fs";
import path from "node:path";

const EXPECTED_PROJECT_REF = "ijxdsuxwbzhvfwedgqzt";
const STOCK_QUANTITY = 10;
const BACKFILL_TAG = "2026-07-11-missing-catalog-products";

const CATEGORY_SLUG_BY_SALE_TYPE = {
  mattress: "colchon",
  set: "conjunto",
};

const PRODUCTS = [
  {
    slug: "colchon-high-rest-foam",
    skuBase: "COL-HR-FOAM",
    name: "Colchón High Rest Foam",
    category: "mattress",
    line: "High Rest",
    technology: "foam",
    displayName: "Foam",
    heightCm: 27,
    pillowType: "none",
    description: "Espuma. 27 cm. Sin pillow.",
    image: "HIGH-REST-FIRM.jpg",
    pricePesos: 839999,
  },
  {
    slug: "conjunto-high-rest-foam",
    skuBase: "CONJ-HR-FOAM",
    name: "Conjunto High Rest Foam",
    category: "set",
    line: "High Rest",
    technology: "foam",
    displayName: "Foam",
    heightCm: 27,
    pillowType: "none",
    description: "Conjunto con sommier. Espuma. 27 cm. Sin pillow.",
    image: "HIGH-REST-FIRM-S.jpg",
    pricePesos: 1189999,
  },
  {
    slug: "colchon-superior-rest-mid",
    skuBase: "COL-SR-MID",
    name: "Colchón Superior Rest Mid",
    category: "mattress",
    line: "Superior Rest",
    technology: "foam",
    displayName: "Mid",
    heightCm: 32,
    pillowType: "american",
    description: "Espuma. 32 cm. Pillow americano.",
    image: "SUPERIOR-REST-MID.jpg",
    pricePesos: 979999,
  },
  {
    slug: "conjunto-superior-rest-mid",
    skuBase: "CONJ-SR-MID",
    name: "Conjunto Superior Rest Mid",
    category: "set",
    line: "Superior Rest",
    technology: "foam",
    displayName: "Mid",
    heightCm: 32,
    pillowType: "american",
    description: "Conjunto con sommier. Espuma. 32 cm. Pillow americano.",
    image: "SUPERIOR-REST-MID-S.jpg",
    pricePesos: 1369999,
  },
  {
    slug: "colchon-superior-rest-mid-plush",
    skuBase: "COL-SR-MID-PLUSH",
    name: "Colchón Superior Rest Mid Plush",
    category: "mattress",
    line: "Superior Rest",
    technology: "bonell",
    displayName: "Mid Plush",
    heightCm: 32,
    pillowType: "american",
    description: "Resortes Bonnell. 32 cm. Pillow americano.",
    image: "SUPERIOR-REST-MID-PLUSH.jpg",
    pricePesos: 1029999,
  },
  {
    slug: "conjunto-superior-rest-mid-plush",
    skuBase: "CONJ-SR-MID-PLUSH",
    name: "Conjunto Superior Rest Mid Plush",
    category: "set",
    line: "Superior Rest",
    technology: "bonell",
    displayName: "Mid Plush",
    heightCm: 32,
    pillowType: "american",
    description: "Conjunto con sommier. Resortes Bonnell. 32 cm. Pillow americano.",
    image: "SUPERIOR-REST-MID-PLUSH-S.jpg",
    pricePesos: 1419999,
  },
  {
    slug: "colchon-superior-rest-ultra-plush",
    skuBase: "COL-SR-ULTRA-PLUSH",
    name: "Colchón Superior Rest Ultra Plush",
    category: "mattress",
    line: "Superior Rest",
    technology: "pocket",
    displayName: "Ultra Plush",
    heightCm: 32,
    pillowType: "american",
    description: "Resortes Pocket. 32 cm. Pillow americano.",
    image: "SUPERIOR-REST-ULTRA-PLUSH.jpg",
    pricePesos: 1099999,
  },
  {
    slug: "conjunto-superior-rest-ultra-plush",
    skuBase: "CONJ-SR-ULTRA-PLUSH",
    name: "Conjunto Superior Rest Ultra Plush",
    category: "set",
    line: "Superior Rest",
    technology: "pocket",
    displayName: "Ultra Plush",
    heightCm: 32,
    pillowType: "american",
    description: "Conjunto con sommier. Resortes Pocket. 32 cm. Pillow americano.",
    image: "SUPERIOR-REST-ULTRA-PLUSH-S.jpg",
    pricePesos: 1489999,
  },
];

function loadEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
}

function getProjectRef(url) {
  return new URL(url).hostname.split(".")[0];
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function productPayload(product, categoryId) {
  const saleType = product.category;
  const categoryLabel = saleType === "set" ? "Conjuntos" : "Colchones";

  return {
    category_id: categoryId,
    slug: product.slug,
    sku_base: product.skuBase,
    name: product.name,
    tagline: product.line,
    short_description: product.description,
    long_description: null,
    status: "active",
    is_featured: false,
    attributes: {
      linea: product.line,
      categoria: categoryLabel,
    },
    metadata: {
      backfill: BACKFILL_TAG,
      line: product.line,
      linea: product.line,
      technology: product.technology,
      sale_type: saleType,
      display_name: product.displayName,
      height_cm: product.heightCm,
      pillow_type: product.pillowType,
      envio_gratis: true,
    },
  };
}

function mediaPayload(product, productId) {
  return {
    product_id: productId,
    variant_id: null,
    media_type: "image",
    url: `storage://colchones/${product.image}`,
    alt: product.name,
    sort_index: 1,
    is_primary: true,
  };
}

function variantPayload(product, productId) {
  return {
    product_id: productId,
    sku: `${product.skuBase}-UNICO`,
    title: "Único",
    price_cents: product.pricePesos * 100,
    compare_at_price_cents: null,
    currency_code: "ARS",
    stock_quantity: STOCK_QUANTITY,
    inventory_status: "in_stock",
    dimensions: {},
    metadata: {
      backfill: BACKFILL_TAG,
      source_slug: product.slug,
    },
  };
}

class SupabaseRest {
  constructor(url, serviceRoleKey) {
    this.url = url;
    this.headers = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };
  }

  async request(pathname, { method = "GET", params = {}, body, prefer } = {}) {
    const requestUrl = new URL(`${this.url}/rest/v1/${pathname}`);
    Object.entries(params).forEach(([key, value]) => requestUrl.searchParams.set(key, value));

    const response = await fetch(requestUrl, {
      method,
      headers: {
        ...this.headers,
        ...(prefer ? { prefer } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`${method} ${pathname} failed: ${response.status} ${await response.text()}`);
    }

    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  }
}

const execute = process.argv.includes("--execute");
loadEnvFile(path.join(process.cwd(), ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const projectRef = getProjectRef(supabaseUrl);
if (projectRef !== EXPECTED_PROJECT_REF) {
  throw new Error(`Refusing to run against project ${projectRef}; expected ${EXPECTED_PROJECT_REF}`);
}

const rest = new SupabaseRest(supabaseUrl, serviceRoleKey);
const slugs = PRODUCTS.map((product) => product.slug);

const categories = await rest.request("categories", {
  params: {
    select: "id,slug",
    slug: "in.(colchon,conjunto)",
  },
});
const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));

const existingProducts = await rest.request("products", {
  params: {
    select: "id,slug,status,product_media(id),product_variants(id)",
    slug: `in.(${slugs.join(",")})`,
    order: "slug.asc",
  },
});
const productBySlug = new Map(existingProducts.map((product) => [product.slug, product]));

const missingProducts = PRODUCTS.filter((product) => !productBySlug.has(product.slug));
const missingMedia = PRODUCTS.filter((product) => {
  const existing = productBySlug.get(product.slug);
  return existing && !existing.product_media?.length;
});
const missingVariants = PRODUCTS.filter((product) => {
  const existing = productBySlug.get(product.slug);
  return existing && !existing.product_variants?.length;
});

console.table(
  PRODUCTS.map((product) => {
    const existing = productBySlug.get(product.slug);
    return {
      slug: product.slug,
      exists: Boolean(existing),
      status: existing?.status ?? "missing",
      media: existing?.product_media?.length ?? 0,
      variants: existing?.product_variants?.length ?? 0,
      image: product.image,
      price: formatPrice(product.pricePesos * 100),
      action: !existing
        ? execute
          ? "insert product/media/variant"
          : "would insert product/media/variant"
        : !existing.product_media?.length || !existing.product_variants?.length
          ? execute
            ? "patch missing children"
            : "would patch missing children"
          : "skip",
    };
  })
);

if (!execute) {
  const pending = missingProducts.length + missingMedia.length + missingVariants.length;
  console.log(`Dry run only. ${pending} pending operations. Re-run with --execute to apply.`);
  process.exit(0);
}

if (missingProducts.length) {
  const payload = missingProducts.map((product) => {
    const categorySlug = CATEGORY_SLUG_BY_SALE_TYPE[product.category];
    const categoryId = categoryIdBySlug.get(categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category ${categorySlug}`);
    }

    return productPayload(product, categoryId);
  });

  await rest.request("products", {
    method: "POST",
    body: payload,
    prefer: "return=representation",
  });

  const refreshed = await rest.request("products", {
    params: {
      select: "id,slug,status,product_media(id),product_variants(id)",
      slug: `in.(${missingProducts.map((product) => product.slug).join(",")})`,
    },
  });

  refreshed.forEach((product) => productBySlug.set(product.slug, product));
}

const mediaRows = PRODUCTS.flatMap((product) => {
  const existing = productBySlug.get(product.slug);
  if (!existing || existing.product_media?.length) return [];
  return [mediaPayload(product, existing.id)];
});

if (mediaRows.length) {
  await rest.request("product_media", {
    method: "POST",
    body: mediaRows,
  });
}

const variantRows = PRODUCTS.flatMap((product) => {
  const existing = productBySlug.get(product.slug);
  if (!existing || existing.product_variants?.length) return [];
  return [variantPayload(product, existing.id)];
});

if (variantRows.length) {
  await rest.request("product_variants", {
    method: "POST",
    body: variantRows,
  });
}

const verified = await rest.request("products", {
  params: {
    select: "slug,status,product_media(id),product_variants(id)",
    slug: `in.(${slugs.join(",")})`,
    order: "slug.asc",
  },
});

const invalid = verified.filter(
  (product) => product.status !== "active" || !product.product_media?.length || !product.product_variants?.length
);

if (invalid.length) {
  throw new Error(`Verification failed for: ${invalid.map((product) => product.slug).join(", ")}`);
}

console.log(
  `Inserted ${missingProducts.length} products, ${mediaRows.length} media rows, ${variantRows.length} variant rows.`
);
