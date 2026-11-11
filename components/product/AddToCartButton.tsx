"use client";

import { useState } from "react";
import { ShoppingCart, Check, X } from "lucide-react";
import { isAtBasketCap, useCart } from "@/components/shared/CartProvider";
import { Product } from "@/types";

interface AddToCartButtonProps {
  product: Product;
  className?: string;
  showText?: boolean;
}

export default function AddToCartButton({
  product,
  className = "",
  showText = false,
}: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);
  const [capped, setCapped] = useState(false);
  const { addItem, items } = useCart();

  const isSoldOut = product.stock === 0 || !product.is_available;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSoldOut) return;

    if (isAtBasketCap(items, product)) {
      setCapped(true);
      setTimeout(() => setCapped(false), 1500);
      return;
    }

    addItem(product);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
    }, 1500);
  };

  const title = isSoldOut
    ? "Sold Out"
    : capped
      ? "Basket holds all available units"
      : added
        ? "Added to Basket"
        : "Add to basket";

  return (
    <button
      type="button"
      disabled={isSoldOut}
      onClick={handleClick}
      title={title}
      aria-label={showText ? undefined : `${title}: ${product.name}`}
      className={`p-2.5 rounded-xl border border-primary-green/20 text-primary-green transition flex items-center justify-center cursor-pointer ${
        added
          ? "bg-primary-green text-cream-bg"
          : capped
            ? "bg-red-50 text-red-600 border-red-200"
            : "bg-primary-green/5 hover:bg-primary-green hover:text-cream-bg"
      } disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {added ? (
        <Check className="h-4 w-4" />
      ) : capped ? (
        <X className="h-4 w-4" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      {showText && (
        <span className="ml-1.5 text-xs font-semibold">
          {added ? "Added" : capped ? "Max" : "Add to Cart"}
        </span>
      )}
    </button>
  );
}

