'use client';

import { useEffect, useState, useCallback, createContext, useContext, useMemo, useTransition } from 'react';
import {
  getCartAction,
  addItemToCartAction,
  updateCartItemQuantityAction,
  removeCartItemAction,
  clearCartAction,
} from '@/app/actions/cart';

const FALLBACK_SIZE = 'Único';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getCartAction();
        if (isMounted) {
          setCart(data);
        }
      } catch (error) {
        console.error('Failed to load cart', error);
      } finally {
        if (isMounted) setInitializing(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateCartState = useCallback((nextCart) => {
    setCart(nextCart);
  }, []);

  const addItem = useCallback(({ variantId, quantity = 1 }) => {
    if (!variantId) return;
    startTransition(() => {
      addItemToCartAction({ variantId, quantity })
        .then((data) => {
          updateCartState(data);
          setIsOpen(true);
        })
        .catch((error) => {
          console.error('Failed to add item', error);
        });
    });
  }, [updateCartState]);

  const updateQty = useCallback((itemId, qty) => {
    if (!itemId || qty < 1) return;
    startTransition(() => {
      updateCartItemQuantityAction({ itemId, quantity: qty })
        .then(updateCartState)
        .catch((error) => console.error('Failed to update quantity', error));
    });
  }, [updateCartState]);

  const removeItem = useCallback((itemId) => {
    if (!itemId) return;
    startTransition(() => {
      removeCartItemAction({ itemId })
        .then(updateCartState)
        .catch((error) => console.error('Failed to remove item', error));
    });
  }, [updateCartState]);

  const clearCart = useCallback(() => {
    startTransition(() => {
      clearCartAction()
        .then(updateCartState)
        .catch((error) => console.error('Failed to clear cart', error));
    });
  }, [updateCartState]);

  const items = useMemo(() => {
    return (cart?.items ?? []).map((item) => ({
      id: item.id,
      key: item.id,
      qty: item.quantity,
      size: item.variant?.label ?? item.variant?.title ?? FALLBACK_SIZE,
      unitPrice: item.unitPrice,
      product: {
        id: item.product?.id ?? item.variant?.id,
        name: item.product?.name ?? 'Producto Sleep',
        slug: item.product?.slug,
        price: item.unitPrice,
      },
    }));
  }, [cart]);

  const total = cart?.total ?? items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const count = cart?.itemCount ?? items.reduce((sum, item) => sum + item.qty, 0);

  const value = {
    cart,
    items,
    total,
    count,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    isOpen,
    setIsOpen,
    status: isPending ? 'loading' : 'idle',
    initializing,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
