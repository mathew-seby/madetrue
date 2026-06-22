"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus, CreditCard } from "lucide-react";
import { Product } from "@/types";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCart = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("madetrue_cart");
        if (stored) {
          try {
            setCart(JSON.parse(stored));
          } catch (e) {
            console.error("Failed to parse cart items", e);
          }
        }
      }
      setLoading(false);
    };

    loadCart();
    window.addEventListener("cart-updated", loadCart);
    return () => {
      window.removeEventListener("cart-updated", loadCart);
    };
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("madetrue_cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const updateQuantity = (productId: string, amount: number) => {
    const updated = cart.map((item) => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, Math.min(item.product.stock, item.quantity + amount));
        return { ...item, quantity: newQty };
      }
      return item;
    });
    saveCart(updated);
  };

  const removeItem = (productId: string) => {
    const filtered = cart.filter((item) => item.product.id !== productId);
    saveCart(filtered);
  };

  const getSubtotal = () => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center text-sm font-semibold text-warm-brown bg-cream-bg min-h-screen">
        Loading your basket...
      </div>
    );
  }

  return (
    <div className="bg-cream-bg min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb Header */}
        <div className="space-y-1">
          <Link href="/products" className="inline-flex items-center text-xs font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider mb-2">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Continue Shopping
          </Link>
          <h1 className="font-serif text-3xl font-bold text-text-dark">Your Basket</h1>
          <p className="text-xs text-text-dark/60">Review your homegrown and handmade items before checkout.</p>
        </div>

        {cart.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Basket Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 flex gap-4 hover:border-primary-green/20 transition shadow-sm"
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-20 h-20 rounded-xl object-cover border border-warm-brown/5 shrink-0 bg-primary-green/5"
                  />
                  <div className="flex-grow flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-base font-bold text-text-dark line-clamp-1">{item.product.name}</h3>
                        <span className="font-semibold text-primary-green shrink-0">₹{item.product.price}</span>
                      </div>
                      <p className="text-[10px] text-warm-brown font-semibold uppercase tracking-wider mt-0.5">{item.product.category}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-warm-brown/5">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-warm-brown/20 rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="px-2 py-1 hover:bg-warm-brown/5 text-text-dark font-bold text-xs"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-xs font-semibold text-text-dark">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="px-2 py-1 hover:bg-warm-brown/5 text-text-dark font-bold text-xs"
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout Total Summary */}
            <div className="bg-[#FAF7F2] p-6 rounded-3xl border border-warm-brown/10 shadow-sm space-y-6">
              <h2 className="font-serif text-lg font-bold text-text-dark">Order Summary</h2>

              <div className="space-y-3 text-xs border-b border-warm-brown/10 pb-4">
                <div className="flex justify-between text-text-dark/70">
                  <span>Subtotal</span>
                  <span>₹{getSubtotal()}</span>
                </div>
                <div className="flex justify-between text-text-dark/70">
                  <span>Delivery (Ernakulam Only)</span>
                  <span className="text-primary-green font-bold uppercase tracking-wider">Free</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-text-dark uppercase tracking-wider">Total</span>
                <span className="font-serif text-2xl font-bold text-primary-green">₹{getSubtotal()}</span>
              </div>

              <div className="space-y-3 pt-2">
                <Link
                  href="/checkout"
                  className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 shadow-sm uppercase tracking-wider font-sans text-center"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Proceed to Checkout
                </Link>
                <p className="text-[10px] text-text-dark/50 text-center font-sans">
                  Deliveries are restricted strictly to Ernakulam district locations. Coordinates will be validated at checkout.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-[#FAF7F2] border border-warm-brown/10 rounded-2xl space-y-4">
            <ShoppingBag className="h-10 w-10 text-warm-brown/40 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-text-dark">Your Basket is Empty</h3>
            <p className="text-xs text-text-dark/60 max-w-sm mx-auto leading-relaxed">
              You haven't added any regional products under your basket yet. Go back to discover authentic spices, pickles, and crafts!
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-5 py-2.5 border border-primary-green rounded-xl text-sm font-semibold text-primary-green hover:bg-primary-green hover:text-cream-bg transition duration-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Explore Local Goods
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
