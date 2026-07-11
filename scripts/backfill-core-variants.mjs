import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_PROJECT_REF = "ijxdsuxwbzhvfwedgqzt";
const STOCK_QUANTITY = 10;

const BACKFILL_ROWS = [
  {
    slug: "colchon-classic-special-foam",
    sku: "COLCHON-CLASSIC-SPECIAL-FOAM-UNICO",
    pricePesos: 619999,
  },
  {
    slug: "colchon-classic-special-pocket",
    sku: "COLCHON-CLASSIC-SPECIAL-POCKET-UNICO",
    pricePesos: 739999,
  },
  {
    slug: "colchon-classic-rest-bonell",
    sku: "COLCHON-CLASSIC-REST-BONELL-UNICO",
    pricePesos: 599999,
  },
  {
    slug: "colchon-top-hotel-rest",
    sku: "COLCHON-TOP-HOTEL-REST-UNICO",
    pricePesos: 1419999,
  },
  {
    slug: "conjunto-classic-special-foam",
    sku: "CONJUNTO-CLASSIC-SPECIAL-FOAM-UNICO",
    pricePesos: 919999,
  },
  {
    slug: "conjunto-classic-special-pocket",
    sku: "CONJUNTO-CLASSIC-SPECIAL-POCKET-UNICO",
    pricePesos: 1039999,
  },
  {
    slug: "conjunto-classic-rest-bonell",
    sku: "CONJUNTO-CLASSIC-REST-BONELL-UNICO",
    pricePesos: 899999,
  },
  {
    slug: "conjunto-high-rest-mid",
    sku: "CONJUNTO-HIGH-REST-MID-UNICO",
    pricePesos: 1309999,
  },
  {
    slug: "conjunto-top-hotel-rest",
    sku: "CONJUNTO-TOP-HOTEL-REST-UNICO",
    pricePesos: 1769999,
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

const execute = process.argv.includes("--execute");
const envPath = path.join(process.cwd(), ".env.local");
loadEnvFile(envPath);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const projectRef = getProjectRef(supabaseUrl);
if (projectRef !== EXPECTED_PROJECT_REF) {
  throw new Error(`Refusing to run against project ${projectRef}; expected ${EXPECTED_PROJECT_REF}`);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const expectedBySlug = new Map(BACKFILL_ROWS.map((row) => [row.slug, row]));

const { data: products, error: productsError } = await supabase
  .from("products")
  .select(
    `
    id,
    slug,
    name,
    status,
    media:product_media (id, url),
    variants:product_variants (id, sku, title, price_cents, stock_quantity)
  `
  )
  .in("slug", BACKFILL_ROWS.map((row) => row.slug))
  .order("slug", { ascending: true });

if (productsError) throw new Error(productsError.message);

const productsBySlug = new Map((products ?? []).map((product) => [product.slug, product]));
const missingProducts = BACKFILL_ROWS.filter((row) => !productsBySlug.has(row.slug));
if (missingProducts.length) {
  throw new Error(`Missing products: ${missingProducts.map((row) => row.slug).join(", ")}`);
}

const invalidProducts = (products ?? []).filter((product) => {
  if (product.status !== "active") return true;
  if (!product.media?.length) return true;
  return false;
});

if (invalidProducts.length) {
  throw new Error(
    `Products are not active or have no media: ${invalidProducts.map((product) => product.slug).join(", ")}`
  );
}

const rowsToInsert = BACKFILL_ROWS.flatMap((row) => {
  const product = productsBySlug.get(row.slug);
  if (product.variants?.length) return [];

  return [
    {
      product_id: product.id,
      sku: row.sku,
      title: "Único",
      price_cents: row.pricePesos * 100,
      compare_at_price_cents: null,
      currency_code: "ARS",
      stock_quantity: STOCK_QUANTITY,
      inventory_status: "in_stock",
      metadata: {
        backfill: "2026-07-11-catalog-quick-fixes",
        source_slug: row.slug,
      },
    },
  ];
});

console.table(
  BACKFILL_ROWS.map((row) => {
    const product = productsBySlug.get(row.slug);
    return {
      slug: row.slug,
      existingVariants: product.variants?.length ?? 0,
      media: product.media?.length ?? 0,
      sku: row.sku,
      price: formatPrice(row.pricePesos * 100),
      action: product.variants?.length ? "skip" : execute ? "insert" : "would insert",
    };
  })
);

if (!rowsToInsert.length) {
  console.log("No rows to insert.");
  process.exit(0);
}

if (!execute) {
  console.log(`Dry run only. ${rowsToInsert.length} rows would be inserted. Re-run with --execute to apply.`);
  process.exit(0);
}

const { error: insertError } = await supabase.from("product_variants").insert(rowsToInsert);
if (insertError) throw new Error(insertError.message);

const { data: verifyProducts, error: verifyError } = await supabase
  .from("products")
  .select("slug, variants:product_variants (id)")
  .in("slug", BACKFILL_ROWS.map((row) => row.slug));

if (verifyError) throw new Error(verifyError.message);

const stillMissingVariants = (verifyProducts ?? []).filter((product) => !product.variants?.length);
if (stillMissingVariants.length) {
  throw new Error(`Verification failed for: ${stillMissingVariants.map((product) => product.slug).join(", ")}`);
}

console.log(`Inserted ${rowsToInsert.length} variant rows and verified all ${BACKFILL_ROWS.length} products.`);
