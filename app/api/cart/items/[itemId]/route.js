import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { getCartByToken, getCartItemCartId } from "@/lib/cart/server";
import { removeCartItem, updateCartItemQuantity } from "@/lib/cart/mutations";

async function resolveOwnedItemCart(itemId) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cart = token ? await getCartByToken(token) : null;
  const itemCartId = await getCartItemCartId(itemId);

  if (!cart || !itemCartId || itemCartId !== cart.id) {
    return null;
  }

  return cart;
}

export async function PATCH(request, { params }) {
  const { itemId } = await params;
  const payload = await request.json().catch(() => null);
  const quantity = Number(payload?.quantity);

  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: "quantity must be >= 1" }, { status: 400 });
  }

  const owned = await resolveOwnedItemCart(itemId);
  if (!owned) {
    return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
  }

  try {
    const cart = await updateCartItemQuantity({ itemId, quantity });
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { itemId } = await params;

  const owned = await resolveOwnedItemCart(itemId);
  if (!owned) {
    return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
  }

  try {
    const cart = await removeCartItem({ itemId });
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
