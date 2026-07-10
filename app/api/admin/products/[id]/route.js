import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/supabase/admin-auth";
import { deleteAdminProduct, getAdminProductById, updateAdminProduct } from "@/lib/products/admin-service";
import { parseAdminProductInput } from "@/lib/products/admin-schema.mjs";

export async function GET(request, { params }) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const product = await getAdminProductById(id);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(request, { params }) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = parseAdminProductInput(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message, field: parsed.error.field }, { status: 400 });
  }

  try {
    const product = await updateAdminProduct(id, parsed.data);
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;

  try {
    await deleteAdminProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
