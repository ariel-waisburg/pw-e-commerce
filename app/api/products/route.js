import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/supabase/queries/products";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 48;

  try {
    const products = await getCatalogProducts({ limit });
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
