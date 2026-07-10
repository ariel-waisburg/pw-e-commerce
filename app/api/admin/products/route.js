import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/supabase/admin-auth";
import { createAdminProduct, listAdminProducts } from "@/lib/products/admin-service";
import { parseAdminProductInput } from "@/lib/products/admin-schema.mjs";

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    const products = await listAdminProducts();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const payload = await request.json().catch(() => null);
  const parsed = parseAdminProductInput(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message, field: parsed.error.field }, { status: 400 });
  }

  try {
    const product = await createAdminProduct(parsed.data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
