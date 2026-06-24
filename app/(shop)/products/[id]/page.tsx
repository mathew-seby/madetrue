"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getProductById, getSellerById, getProductsBySellerId } from "@/lib/supabase/client";
import { Product, Seller } from "@/types";
import { calculateDistance, formatDistance } from "@/lib/utils/distance";
import { MapPin, Store, ArrowLeft, ShoppingBag, Heart, ShieldAlert, Sparkles, Zap } from "lucide-react";

// Default location Kochi
const DEFAULT_LAT = 9.9816;
const DEFAULT_LNG = 76.2999;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [makerProducts, setMakerProducts] = useState<Product[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToBasket = () => {
    if (!product) return;
    const stored = localStorage.getItem("madetrue_cart");
    let cart: { product: Product; quantity: number }[] = [];
    if (stored) {
      try {
        cart = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex !== -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({ product, quantity });
    }
    localStorage.setItem("madetrue_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
    }, 2000);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const prod = await getProductById(id);
      if (prod) {
        setProduct(prod);
        const sel = await getSellerById(prod.seller_id);
        if (sel) {
          setSeller(sel);
          const others = await getProductsBySellerId(sel.id);
          // Exclude current product
          setMakerProducts(others.filter((p) => p.id !== prod.id).slice(0, 3));
        }
      }
      setLoading(false);
    }
    loadData();

    // Check browser location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setUserCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        }
      );
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm font-semibold text-warm-brown">
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-text-dark">Product Not Found</h2>
        <p className="text-sm text-text-dark/60">The item you are looking for does not exist in our store.</p>
        <Link
          href="/products"
          className="inline-flex items-center text-sm font-semibold text-primary-green hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Shop
        </Link>
      </div>
    );
  }

  const centerLat = userCoords?.lat ?? DEFAULT_LAT;
  const centerLng = userCoords?.lng ?? DEFAULT_LNG;
  const distance = seller
    ? calculateDistance(centerLat, centerLng, seller.lat, seller.lng)
    : null;



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
    <div className="bg-cream-bg min-h-screen pb-16">
      {/* Cover / Breadcrumb */}
      <div className="bg-gradient-to-r from-primary-green/10 to-warm-brown/10 py-6 border-b border-warm-brown/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/products"
            className="inline-flex items-center text-xs font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Shop
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Main Product Frame */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start bg-[#FAF7F2] p-6 sm:p-8 rounded-3xl border border-warm-brown/10">
          {/* Product Image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-primary-green/5 border border-warm-brown/5 shadow-sm">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {distance !== null && (
              <div className="absolute top-4 left-4 inline-flex items-center px-3 py-1 rounded-full bg-cream-bg/95 text-[10px] font-bold text-warm-brown shadow border border-warm-brown/10">
                <MapPin className="h-3 w-3 mr-1 text-primary-green animate-pulse" />
                <span>{formatDistance(distance)} away</span>
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="space-y-6">
            <div className="space-y-2">
              {seller && (
                <Link
                  href={`/sellers/${seller.id}`}
                  className="inline-flex items-center text-xs font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider"
                >
                  <Store className="h-3.5 w-3.5 mr-1 text-primary-green" />
                  <span>{seller.business_name}</span>
                </Link>
              )}

              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-dark">
                {product.name}
              </h1>

              {/* Price */}
              <p className="font-serif text-2xl font-bold text-primary-green pt-1">
                ₹{product.price}
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(
                    tag
                  )}`}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-sm text-text-dark/85 leading-relaxed">
              {product.description}
            </p>

            {/* Origin Details Block */}
            <div className="p-4 rounded-xl bg-primary-green/5 border border-primary-green/10 flex items-start space-x-3">
              <Sparkles className="h-5 w-5 text-primary-green flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-green">
                  Origin & Raw Details
                </h4>
                <p className="text-xs text-text-dark/80 leading-relaxed">
                  {product.origin_details}
                </p>
              </div>
            </div>

            {/* Quantity and Order Panel */}
            <div className="pt-4 border-t border-warm-brown/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-dark/65 uppercase tracking-wider">
                  Quantity
                </span>
                <div className="flex items-center border border-warm-brown/20 rounded-xl overflow-hidden bg-cream-bg">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3.5 py-1.5 hover:bg-warm-brown/5 text-text-dark font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="px-4 text-sm font-semibold text-text-dark">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="px-3.5 py-1.5 hover:bg-warm-brown/5 text-text-dark font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Order Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleAddToBasket}
                  className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 cursor-pointer"
                >
                  <ShoppingBag className="h-4.5 w-4.5 mr-2" />
                  {addedToCart ? "Added to Basket! ✓" : "Add to Basket"}
                </button>
                <button
                  className="inline-flex items-center justify-center px-5 py-3 bg-warm-brown hover:bg-[#684a30] text-cream-bg font-semibold text-sm rounded-xl transition duration-200 cursor-pointer"
                >
                  <Zap className="h-4.5 w-4.5 mr-2 fill-cream-bg" />
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Meet the Maker Bio Section */}
        {seller && (
          <div className="bg-[#FAF7F2] rounded-3xl border border-warm-brown/10 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary-green/20 shrink-0">
                <img
                  src={seller.profile_photo_url}
                  alt={seller.business_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-3 text-center sm:text-left">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-warm-brown tracking-wider">
                    Meet the Maker
                  </span>
                  <h3 className="font-serif text-xl font-bold text-text-dark">
                    {seller.business_name}
                  </h3>
                </div>
                <p className="text-sm text-text-dark/85 leading-relaxed italic pl-4 border-l-2 border-accent-gold/40">
                  "{seller.story.substring(0, 220)}..."
                </p>
                <div className="pt-2">
                  <Link
                    href={`/sellers/${seller.id}`}
                    className="inline-flex items-center text-xs font-bold text-primary-green hover:underline uppercase tracking-widest"
                  >
                    Read Full Story & Explore Store &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cross Selling */}
        {makerProducts.length > 0 && (
          <div className="space-y-6">
            <h3 className="font-serif text-2xl font-bold text-text-dark">
              More Goods from this Maker
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {makerProducts.map((p) => (
                <div
                  key={p.id}
                  className="group bg-[#FAF7F2] rounded-2xl border border-warm-brown/10 hover:border-primary-green/30 hover:shadow-md transition duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="relative aspect-square overflow-hidden bg-primary-green/5 border-b border-warm-brown/5">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                      {p.tags.slice(0, 1).map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${getBadgeStyle(
                            tag
                          )}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${p.id}`}
                          className="font-serif text-sm font-bold text-text-dark hover:text-primary-green transition line-clamp-1"
                        >
                          {p.name}
                        </Link>
                        <span className="font-serif text-sm font-bold text-primary-green shrink-0">
                          ₹{p.price}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-warm-brown/5 flex items-center justify-between">
                      <Link
                        href={`/products/${p.id}`}
                        className="text-[10px] font-bold uppercase text-warm-brown hover:text-primary-green tracking-wider"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
