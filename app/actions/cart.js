"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { CART_COOKIE_NAME, CART_COOKIE_MAX_AGE_SECONDS } from "@/lib/cart/constants";
import { serializeCartRecord } from "@/lib/cart/serializer";
import { getCartByToken, recalculateCartTotals, refetchCart } from "@/lib/cart/server";

const supabase = () => getSupabaseServiceRole();

function setCartCookie(cookieStore, token) {
  cookieStore.set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
}

async function ensureCartWithToken() {
  const cookieStore = await cookies();
  let token = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (token) {
    const existing = await getCartByToken(token);
    if (existing) {
      return { cart: existing, token };
    }
  }

  token = randomUUID();
  setCartCookie(cookieStore, token);

  const { data, error } = await supabase()
    .from("carts")
    .insert({
      anonymous_key: token,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    const fallbackCart = await getCartByToken(token);
    if (!fallbackCart?.id) {
      throw new Error("Failed to create cart");
    }

    return { cart: fallbackCart, token };
  }

  const cartWithRelations = await refetchCart(data.id);

  return { cart: cartWithRelations ?? data, token };
}

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
  const { cart } = await ensureCartWithToken();
  return serializeCartRecord(cart);
}

export async function addItemToCartAction({ variantId, quantity = 1 }) {
  if (!variantId) {
    throw new Error("variantId is required");
  }

  if (quantity < 1) {
    quantity = 1;
  }

  const { cart } = await ensureCartWithToken();
  const cartId = cart.id;

  const { data: variant, error: variantError } = await supabase()
    .from("product_variants")
    .select(
      `
      id,
      product_id,
      price_cents,
      compare_at_price_cents,
      currency_code,
      title,
      product:products!product_variants_product_id_fkey (
        id,
        name,
        slug
      )
    `
    )
    .eq("id", variantId)
    .single();

  if (variantError) {
    throw new Error(variantError.message);
  }

  const { data: existing } = await supabase()
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .maybeSingle();

  if (existing) {
    const newQty = existing.quantity + quantity;
    const { error: updateError } = await supabase()
      .from("cart_items")
      .update({
        quantity: newQty,
        unit_price_cents: variant.price_cents,
        currency_code: variant.currency_code,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { error: insertError } = await supabase().from("cart_items").insert({
      cart_id: cartId,
      product_id: variant.product_id,
      variant_id: variant.id,
      quantity,
      unit_price_cents: variant.price_cents,
      currency_code: variant.currency_code,
      metadata: {
        product_name: variant.product?.name,
        product_slug: variant.product?.slug,
      },
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  await recalculateCartTotals(cartId);
  const updated = await refetchCart(cartId);
  revalidatePath("/");
  return serializeCartRecord(updated);
}

export async function updateCartItemQuantityAction({ itemId, quantity }) {
  if (!itemId) throw new Error("itemId is required");
  if (!quantity || quantity < 1) throw new Error("quantity must be >= 1");

  const { data: item, error: itemError } = await supabase()
    .from("cart_items")
    .select("cart_id")
    .eq("id", itemId)
    .single();

  if (itemError) {
    throw new Error(itemError.message);
  }

  const { error: updateError } = await supabase()
    .from("cart_items")
    .update({ quantity })
    .eq("id", itemId);

  if (updateError) throw new Error(updateError.message);

  await recalculateCartTotals(item.cart_id);
  const updated = await refetchCart(item.cart_id);
  return serializeCartRecord(updated);
}

export async function removeCartItemAction({ itemId }) {
  if (!itemId) throw new Error("itemId is required");

  const { data: item, error: itemError } = await supabase()
    .from("cart_items")
    .select("cart_id")
    .eq("id", itemId)
    .single();

  if (itemError) {
    throw new Error(itemError.message);
  }

  const { error: deleteError } = await supabase().from("cart_items").delete().eq("id", itemId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await recalculateCartTotals(item.cart_id);
  const updated = await refetchCart(item.cart_id);
  return serializeCartRecord(updated);
}

export async function clearCartAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  if (!token) return null;

  const cart = await getCartByToken(token);
  if (!cart) return null;

  const { error } = await supabase().from("cart_items").delete().eq("cart_id", cart.id);
  if (error) throw new Error(error.message);

  await recalculateCartTotals(cart.id);
  const updated = await refetchCart(cart.id);
  return serializeCartRecord(updated);
}
