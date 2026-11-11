"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Zap } from "lucide-react";
import { isAtBasketCap, useCart } from "@/components/shared/CartProvider";
import { Product } from "@/types";

interface ProductOrderActionsProps {
  product: Product;
}

export default function ProductOrderActions({ product }: ProductOrderActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [basketFullCue, setBasketFullCue] = useState(false);

  const router = useRouter();
  const { addItem, items } = useCart();

  const isSoldOut = product.stock === 0 || !product.is_available;

  const handleAddToBasket = () => {
    if (isSoldOut) return;
    if (isAtBasketCap(items, product)) {
      setBasketFullCue(true);
      setTimeout(() => setBasketFullCue(false), 2000);
      return;
    }
    addItem(product, quantity);
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
    }, 2000);
  };

  const handleBuyNow = () => {
    if (isSoldOut) return;
    addItem(product, quantity);
    router.push("/checkout");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-text-dark/65 uppercase tracking-wider">
          Quantity
        </span>
        <div className="flex items-center border border-warm-brown/20 rounded-xl overflow-hidden bg-cream-bg">
          <button
            type="button"
            disabled={isSoldOut}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="px-3.5 py-1.5 hover:bg-warm-brown/5 text-text-dark font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            -
          </button>
          <span
            className="px-4 text-sm font-semibold text-text-dark"
            aria-label={`Current quantity: ${isSoldOut ? 0 : quantity}`}
          >
            {isSoldOut ? 0 : quantity}
          </span>
          <button
            type="button"
            disabled={isSoldOut}
            onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            aria-label="Increase quantity"
            className="px-3.5 py-1.5 hover:bg-warm-brown/5 text-text-dark font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      {/* Order Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          disabled={isSoldOut}
          onClick={handleAddToBasket}
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-green"
        >
          <ShoppingBag className="h-4.5 w-4.5 mr-2" />
          {addedToCart
            ? "Added to Basket! ✓"
            : basketFullCue
              ? "Basket is Full"
              : "Add to Basket"}
        </button>
        <button
          type="button"
          disabled={isSoldOut}
          onClick={handleBuyNow}
          className="inline-flex items-center justify-center px-5 py-3 bg-warm-brown hover:bg-[#684a30] text-cream-bg font-semibold text-sm rounded-xl transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-warm-brown"
        >
          <Zap className="h-4.5 w-4.5 mr-2 fill-cream-bg" />
          Buy Now
        </button>
      </div>
    </div>
  );
}

