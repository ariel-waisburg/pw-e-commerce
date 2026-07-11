"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { serializeCartRecord } from "@/lib/cart/serializer";
import { getCartByToken } from "@/lib/cart/server";
import { setCartCookie } from "@/lib/cart/cookie";
import {
  addItemToCart,
  clearCartByToken,
  ensureCartWithToken,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart/mutations";

export async function getCartAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const cart = await getCartByToken(token);
  return serializeCartRecord(cart);
}

export async function createCartAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;

  const { cart, token: resolvedToken } = await ensureCartWithToken(token);
  if (resolvedToken !== token) {
    setCartCookie(cookieStore, resolvedToken);
  }

  return serializeCartRecord(cart);
}

export async function addItemToCartAction({ variantId, quantity = 1 }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;

  const { cart, token: resolvedToken } = await addItemToCart({ token, variantId, quantity });
  if (resolvedToken !== token) {
    setCartCookie(cookieStore, resolvedToken);
  }

  revalidatePath("/");
  return cart;
}

export async function updateCartItemQuantityAction({ itemId, quantity }) {
  return updateCartItemQuantity({ itemId, quantity });
}

export async function removeCartItemAction({ itemId }) {
  return removeCartItem({ itemId });
}

export async function clearCartAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  return clearCartByToken(token);
}
