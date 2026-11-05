"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Product } from "@/types";

// Shared basket state for the whole app.
// The storage key (`madetrue_cart`) and the `cart-updated` window event are kept
// exactly as they were before the t provider existed, so screens that still read
// localStorage directly (Navbar, /cart, /checkout) stay in sync until they are
// migrated to `useCart()` (roadmap phase 1, step 2).

const CART_KEY = "madetrue_cart";
const CART_UPDATED_EVENT = "cart-updated";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/* ------------------------------------------------------------------ */
/* Storage helpers                                                     */
/* ------------------------------------------------------------------ */

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CartItem>;
  return (
    typeof candidate.product === "object" &&
    candidate.product !== null &&
    typeof candidate.product.price === "number" &&
    typeof candidate.product.stock === "number" &&
    typeof candidate.quantity === "number"
  );
}

// Read storage once; the module-level store keeps the parsed array cached in
// memory afterwards, so no further localStorage reads are needed per render.
function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(CART_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItem);
  } catch (error) {
    console.error("Failed to parse the stored cart", error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Module-level cart store (external store for useSyncExternalStore)   */
/* ------------------------------------------------------------------ */

const EMPTY_CART: CartItem[] = [];
let cart: CartItem[] = EMPTY_CART;
let hydrated = false;
// One subscription set per runtime instead of one global listener per hook
// call; all additive changes go through emitChange().
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of [...listeners]) listener();
}

function sameCart(a: CartItem[], b: CartItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hydrateIfNeeded() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  cart = readCart();
}

// Legacy screens (and other tabs) rewrite storage and re-announce it with the
// same `cart-updated` event this store dispatches on its own writes, so all
// writers converge on the newest stored state instead of drifting apart.
function syncFromStorage() {
  hydrateIfNeeded();
  const stored = readCart();
  if (sameCart(stored, cart)) return;
  cart = stored;
  emitChange();
}

function onStorageSync(event: Event) {
  if (event instanceof StorageEvent && event.key !== CART_KEY) return;
  syncFromStorage();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener(CART_UPDATED_EVENT, onStorageSync);
  window.addEventListener("storage", onStorageSync);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener(CART_UPDATED_EVENT, onStorageSync);
      window.removeEventListener("storage", onStorageSync);
    }
  };
}

function getSnapshot(): CartItem[] {
  hydrateIfNeeded();
  return cart;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

// Commit a new basket: notify React first, then persist to storage, then ping
// the legacy `cart-updated` listeners (our own sync handler re-reads it and
// finds it equal, so it stays a no-op for the store itself).
function writeCart(next: CartItem[]) {
  if (sameCart(next, cart)) return;
  cart = next;
  emitChange();
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  } catch (error) {
    console.error("Failed to save the cart", error);
  }
}

/* ------------------------------------------------------------------ */
/* Cart actions                                                        */
/* ------------------------------------------------------------------ */

function addItem(product: Product, quantity = 1) {
  // Sold-out products never enter the basket.
  if (!product.is_available || product.stock <= 0) return;

  const requested = Math.max(1, Math.floor(quantity));
  const existing = cart.find((item) => item.product.id === product.id);
  if (existing) {
    // Cap the basket at what the maker still has in stock.
    const capped = Math.min(existing.quantity + requested, product.stock);
    if (capped === existing.quantity) return;
    writeCart(
      cart.map((item) =>
        item.product.id === product.id ? { ...item, quantity: capped } : item
      )
    );
    return;
  }
  writeCart([...cart, { product, quantity: Math.min(requested, product.stock) }]);
}

function updateQuantity(productId: string, quantity: number) {
  const target = cart.find((item) => item.product.id === productId);
  if (!target) return;

  // The maker ran out after this item was added: drop the line instead of
  // keeping a phantom quantity.
  if (target.product.stock <= 0) {
    writeCart(cart.filter((item) => item.product.id !== productId));
    return;
  }
  const capped = Math.min(Math.max(1, Math.floor(quantity)), target.product.stock);
  if (capped === target.quantity) return;
  writeCart(
    cart.map((item) =>
      item.product.id === productId ? { ...item, quantity: capped } : item
    )
  );
}

function removeItem(productId: string) {
  writeCart(cart.filter((item) => item.product.id !== productId));
}

function clearCart() {
  writeCart([]);
}

// True when the basket already holds every unit of this product that exists
// — callers use it to show honest "basket full" feedback instead of a
// misleading "added!" flash that the provider would have ignored anyway.
export function isAtBasketCap(items: CartItem[], product: Product): boolean {
  const existing = items.find((item) => item.product.id === product.id);
  return Boolean(existing && existing.quantity >= product.stock);
}

/* ------------------------------------------------------------------ */
/* Provider & hook                                                     */
/* ------------------------------------------------------------------ */

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const { count, subtotal } = useMemo(() => {
    // One pass for both metrics instead of a loop per metric.
    let count = 0;
    let subtotal = 0;
    for (const item of items) {
      count += item.quantity;
      subtotal += item.product.price * item.quantity;
    }
    return { count, subtotal };
  }, [items]);

  const value = useMemo<CartContextType>(
    () => ({ items, count, subtotal, addItem, updateQuantity, removeItem, clearCart }),
    // Actions are module-level constants, so this only re-creates when the
    // cart data itself changes.
    [items, count, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
