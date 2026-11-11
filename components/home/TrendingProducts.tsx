"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProducts, getSellers } from "@/lib/supabase/client";
import { isAtBasketCap, useCart } from "@/components/shared/CartProvider";
import { Product, Seller } from "@/types";
import { ShoppingCart, Heart, Store, Check, X } from "lucide-react";

interface TrendingProductsProps {
  initialProducts?: Product[];
  initialSellers?: { [key: string]: Seller };
}

export default function TrendingProducts({
  initialProducts,
  initialSellers,
}: TrendingProductsProps = {}) {
  const [products, setProducts] = useState<Product[]>(
    initialProducts ? initialProducts.slice(0, 4) : []
  );
  const [sellers, setSellers] = useState<{ [key: string]: Seller }>(
    initialSellers ?? {}
  );
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [cappedProductId, setCappedProductId] = useState<string | null>(null);

  const { addItem, items } = useCart();

  const handleAddToCart = (product: Product) => {
    // Honest feedback: if the basket already holds all available stock the
    // provider would no-op this add — show that instead of an "added" flash.
    if (isAtBasketCap(items, product)) {
      setCappedProductId(product.id);
      setTimeout(() => setCappedProductId(null), 1500);
      return;
    }
    addItem(product);
    setAddedProductId(product.id);
    setTimeout(() => {
      setAddedProductId(null);
    }, 1500);
  };

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0 && initialSellers) return;
    async function load() {
      const prodData = await getProducts();
      const sellerData = await getSellers();

      // Create a map of seller id to seller details
      const sellerMap = sellerData.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {} as { [key: string]: Seller });

      setProducts(prodData.slice(0, 4));
      setSellers(sellerMap);
    }
    load();
  }, [initialProducts, initialSellers]);

  // Badge background color map
  const getBadgeStyle = (tag: string) => {
    switch (tag) {
      case "Same Day Delivery":
        return "bg-primary-green/10 text-primary-green";
      case "Pickup Available":
        return "bg-warm-brown/10 text-warm-brown";
      case "Fresh Today":
        return "bg-accent-gold/20 text-warm-brown";
      case "Locally Made":
        return "bg-emerald-100 text-emerald-800";
      case "Eco-Friendly":
        return "bg-blue-50 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <section className="bg-[#FAF7F2] py-16 px-4 sm:px-6 lg:px-8 border-t border-warm-brown/5">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs uppercase font-bold text-warm-brown tracking-widest">
              Selected by Neighbors
            </span>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-text-dark">
              Trending Local Products
            </h2>
            <p className="text-sm text-text-dark/70 max-w-lg leading-relaxed">
              Discover popular, freshly made items from our regional producers that neighbors are ordering.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center justify-center px-4.5 py-2.5 rounded-xl border border-warm-brown/20 text-sm font-semibold text-warm-brown hover:bg-warm-brown/5 transition duration-200"
          >
            View All Products
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const seller = sellers[product.seller_id];
            return (
              <div
                key={product.id}
                className="group bg-cream-bg rounded-2xl border border-warm-brown/10 hover:border-primary-green/30 hover:shadow-lg transition duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Image & Favorite Button */}
                <div className="relative aspect-square bg-primary-green/5 border-b border-warm-brown/5 overflow-hidden">
                  <Link href={`/products/${product.id}`} className="block h-full w-full">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </Link>
                  {/* Favorite button */}
                  <button
                    type="button"
                    aria-label={`Save ${product.name} to wishlist`}
                    className="absolute top-3 right-3 p-2 rounded-full bg-cream-bg/80 hover:bg-cream-bg text-text-dark hover:text-red-500 shadow-sm transition cursor-pointer"
                  >
                    <Heart className="h-4.5 w-4.5" />
                  </button>

                  {/* Badges Container */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                    {product.stock > 0 && product.stock <= 2 && product.is_available && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-white text-[8px] font-bold uppercase tracking-wider animate-pulse shadow-sm font-sans">
                        ⚠️ Only {product.stock} Left!
                      </div>
                    )}
                  </div>
                  {/* Sold out overlay */}
                  {(product.stock === 0 || !product.is_available) && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-10">
                      <span className="text-white text-xs font-bold uppercase tracking-widest border border-white/30 px-3 py-1 rounded-lg font-sans">
                        Sold Out
                      </span>
                    </div>
                  )}
                  {/* Tags Container */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                    {product.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getBadgeStyle(
                          tag
                        )}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Seller Link */}
                    {seller && (
                      <Link
                        href={`/sellers/${seller.id}`}
                        className="inline-flex items-center text-[11px] font-semibold text-warm-brown hover:text-primary-green transition"
                      >
                        <Store className="h-3 w-3 mr-1 text-primary-green" />
                        <span>{seller.business_name}</span>
                      </Link>
                    )}

                    {/* Product Name & Price */}
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${product.id}`}
                        className="font-serif text-base font-bold text-text-dark hover:text-primary-green transition line-clamp-1"
                      >
                        {product.name}
                      </Link>
                      <span className="font-serif text-base font-bold text-primary-green shrink-0">
                        ₹{product.price}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-text-dark/70 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Add to Cart CTA */}
                  <div className="pt-2 border-t border-warm-brown/5 flex items-center justify-between gap-4">
                    <Link
                      href={`/products/${product.id}`}
                      className="text-[11px] font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider"
                    >
                      Meet the Maker
                    </Link>
                    {product.stock === 0 || !product.is_available ? (
                      <button
                        type="button"
                        disabled
                        className="flex items-center justify-center p-2 rounded-xl bg-gray-200 text-gray-400 cursor-not-allowed"
                        title="Sold Out"
                        aria-label={`${product.name} is sold out`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        aria-label={
                          cappedProductId === product.id
                            ? `Basket already holds max stock of ${product.name}`
                            : addedProductId === product.id
                              ? `Added ${product.name} to basket`
                              : `Add ${product.name} to basket`
                        }
                        title={
                          cappedProductId === product.id
                            ? "Basket already holds every unit in stock"
                            : "Add to Basket"
                        }
                        className={`flex items-center justify-center p-2 rounded-xl transition duration-200 cursor-pointer ${
                          addedProductId === product.id
                            ? "bg-emerald-600 text-white scale-105"
                            : cappedProductId === product.id
                              ? "bg-warm-brown text-cream-bg scale-105"
                              : "bg-primary-green text-cream-bg hover:bg-[#224f3b]"
                        }`}
                      >
                        {addedProductId === product.id ? (
                          <Check className="h-4 w-4" />
                        ) : cappedProductId === product.id ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider">Max</span>
                        ) : (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
