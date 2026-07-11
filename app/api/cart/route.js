import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { serializeCartRecord } from "@/lib/cart/serializer";
import { getCartByToken } from "@/lib/cart/server";
import { clearCartByToken } from "@/lib/cart/mutations";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ cart: null });
  }

  try {
    const cart = await getCartByToken(token);
    return NextResponse.json({ cart: serializeCartRecord(cart) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;

  try {
    const cart = await clearCartByToken(token);
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
