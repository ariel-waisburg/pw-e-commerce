import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { setCartCookie } from "@/lib/cart/cookie";
import { addItemToCart } from "@/lib/cart/mutations";

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  const variantId = payload?.variantId;
  const quantity = payload?.quantity;

  if (!variantId) {
    return NextResponse.json({ error: "variantId is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;

  try {
    const { cart, token: resolvedToken } = await addItemToCart({ token, variantId, quantity });
    if (resolvedToken !== token) {
      setCartCookie(cookieStore, resolvedToken);
    }
    return NextResponse.json({ cart }, { status: 201 });
  } catch (error) {
    const status = error.message === "Variante no encontrada" ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
