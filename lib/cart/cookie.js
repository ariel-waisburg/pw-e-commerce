import { CART_COOKIE_NAME, CART_COOKIE_MAX_AGE_SECONDS } from "@/lib/cart/constants";

export function setCartCookie(cookieStore, token) {
  cookieStore.set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
}
