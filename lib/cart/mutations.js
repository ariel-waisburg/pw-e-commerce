import { randomUUID } from "crypto";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { serializeCartRecord } from "@/lib/cart/serializer";
import { getCartByToken, recalculateCartTotals, refetchCart } from "@/lib/cart/server";

const supabase = () => getSupabaseServiceRole();

export async function ensureCartWithToken(token) {
  if (token) {
    const existing = await getCartByToken(token);
    if (existing) {
      return { cart: existing, token };
    }
  }

  const newToken = randomUUID();

  const { data, error } = await supabase()
    .from("carts")
    .insert({
      anonymous_key: newToken,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    const fallbackCart = await getCartByToken(newToken);
    if (!fallbackCart?.id) {
      throw new Error("Failed to create cart");
    }

    return { cart: fallbackCart, token: newToken };
  }

  const cartWithRelations = await refetchCart(data.id);

  return { cart: cartWithRelations ?? data, token: newToken };
}

export async function addItemToCart({ token, variantId, quantity = 1 }) {
  if (!variantId) {
    throw new Error("variantId is required");
  }

  if (quantity < 1) {
    quantity = 1;
  }

  const { cart, token: resolvedToken } = await ensureCartWithToken(token);
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
    .maybeSingle();

  if (variantError) {
    throw new Error(variantError.message);
  }

  if (!variant) {
    throw new Error("Variante no encontrada");
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

  return { cart: serializeCartRecord(updated), token: resolvedToken };
}

export async function updateCartItemQuantity({ itemId, quantity }) {
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

export async function removeCartItem({ itemId }) {
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

export async function clearCartByToken(token) {
  if (!token) return null;

  const cart = await getCartByToken(token);
  if (!cart) return null;

  const { error } = await supabase().from("cart_items").delete().eq("cart_id", cart.id);
  if (error) throw new Error(error.message);

  await recalculateCartTotals(cart.id);
  const updated = await refetchCart(cart.id);
  return serializeCartRecord(updated);
}
