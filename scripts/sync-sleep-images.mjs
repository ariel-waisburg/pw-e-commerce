import { createClient } from "@supabase/supabase-js";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";

const BUCKET = "colchones";
const TARGET_DIR = path.join(process.cwd(), "public", "products");

const STALE_FILES = [
  "CLASSIC-FOAM-1.jpg",
  "CLASSIC-POCKET-1.jpg",
  "CLASSIC-REST-BONELL-1.jpg",
  "HIGH-REST-FIRM-1.jpg",
  "HIGH-REST-MID-1.jpg",
  "HIGH-REST-PLUSH-1.jpg",
  "SUPERIOR-REST-MID-1.jpg",
  "SUPERIOR-REST-MID-PLUSH-1.jpg",
  "SUPERIOR-REST-ULTRA-PLUSH-1.jpg",
  "TOP-HOTEL-REST-1.jpg",
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment");
  }

  const supabase = createClient(url, key);
  const { data: files, error: listError } = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
  if (listError) throw listError;

  for (const file of files) {
    const { data, error } = await supabase.storage.from(BUCKET).download(file.name);
    if (error) throw new Error(`Failed to download ${file.name}: ${error.message}`);
    const buffer = Buffer.from(await data.arrayBuffer());
    await writeFile(path.join(TARGET_DIR, file.name), buffer);
    console.log(`Synced ${file.name} (${buffer.length} bytes)`);
  }

  for (const staleFile of STALE_FILES) {
    await unlink(path.join(TARGET_DIR, staleFile)).catch(() => {});
    console.log(`Removed stale ${staleFile}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
