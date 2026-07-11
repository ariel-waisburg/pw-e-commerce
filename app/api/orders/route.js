import { NextResponse } from "next/server";
import { requireCustomerSession } from "@/lib/supabase/customer-auth";
import { listOrdersByCustomer } from "@/lib/orders/server";

export async function GET() {
  const { session, error } = await requireCustomerSession();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  try {
    const orders = await listOrdersByCustomer(session.user.id);
    return NextResponse.json({ orders });
  } catch (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
}
