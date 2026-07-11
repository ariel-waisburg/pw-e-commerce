import { NextResponse } from "next/server";
import { requireCustomerSession } from "@/lib/supabase/customer-auth";
import { getOrderById, serializeOrderRecord } from "@/lib/orders/server";

export async function GET(request, { params }) {
  const { session, error } = await requireCustomerSession();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const { id } = await params;

  let orderRecord;
  try {
    orderRecord = await getOrderById(id);
  } catch (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!orderRecord) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (orderRecord.customer_id !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({ order: serializeOrderRecord(orderRecord) });
}
