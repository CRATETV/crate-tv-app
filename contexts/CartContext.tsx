import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createCart,
  addCartItem,
  updateCartItem,
  getCart,
  getCheckoutUrl,
  FourthwallCart,
} from '../services/fourthwall';

const CART_ID_STORAGE_KEY = 'crate_fourthwall_cart_id';

interface CartContextValue {
  cart: FourthwallCart | null;
  itemCount: number;
  loading: boolean;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (variantId: string, quantity: number) => Promise<void>;
  checkoutUrl: string | null;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<FourthwallCart | null>(null);
  const [loading, setLoading] = useState(false);

  // On first load, resume an existing cart if we have one saved, so a
  // returning visitor doesn't lose items they'd already added.
  useEffect(() => {
    const savedId = localStorage.getItem(CART_ID_STORAGE_KEY);
    if (!savedId) return;
    getCart(savedId)
      .then(setCart)
      .catch(() => {
        // Cart may have expired or been completed since — start fresh
        // rather than holding onto a dead id.
        localStorage.removeItem(CART_ID_STORAGE_KEY);
      });
  }, []);

  const addItem = useCallback(
    async (variantId: string, quantity: number = 1) => {
      setLoading(true);
      try {
        let current = cart;
        if (!current) {
          current = await createCart([{ variantId, quantity }]);
        } else {
          current = await addCartItem(current.id, variantId, quantity);
        }
        localStorage.setItem(CART_ID_STORAGE_KEY, current.id);
        setCart(current);
      } finally {
        setLoading(false);
      }
    },
    [cart]
  );

  const updateItem = useCallback(
    async (variantId: string, quantity: number) => {
      if (!cart) return;
      setLoading(true);
      try {
        const updated = await updateCartItem(cart.id, variantId, quantity);
        setCart(updated);
      } finally {
        setLoading(false);
      }
    },
    [cart]
  );

  const itemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  const checkoutUrl = cart ? getCheckoutUrl(cart.id) : null;

  return (
    <CartContext.Provider value={{ cart, itemCount, loading, addItem, updateItem, checkoutUrl }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
