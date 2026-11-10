"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getSellerById, getProductsBySellerId } from "@/lib/supabase/client";
import { isAtBasketCap, useCart } from "@/components/shared/CartProvider";
import { Seller, Product } from "@/types";
import { calculateDistance } from "@/lib/utils/distance";
import { useUserLocation } from "@/lib/hooks/useUserLocation";
import SellerMap from "@/components/map/SellerMap";
import DistanceBadge from "@/components/map/DistanceBadge";
import {
  MapPin,
  CheckCircle2,
  MessageCircle,
  ArrowLeft,
  ShoppingCart,
  Heart,
  Check,
  Navigation,
  AlertCircle,
  X,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SellerProfilePage({ params }: PageProps) {
  const { id } = use(params);

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [cappedProductId, setCappedProductId] = useState<string | null>(null);

  const { addItem, items } = useCart();
  const { userCoords, locError, requestLocation } = useUserLocation();

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
    async function loadData() {
      setLoading(true);
      const s = await getSellerById(id);
      if (s) {
        setSeller(s);
        const p = await getProductsBySellerId(s.id);
        setProducts(p);
      }
      setLoading(false);
    }
    loadData();

    // Ask for location so the distance to this maker is real — on a refusal
    // or failure the hook keeps userCoords null and locError explains why.
    requestLocation();
  }, [id, requestLocation]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm font-semibold text-warm-brown">
        Loading maker profile...
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-text-dark">Maker Not Found</h2>
        <p className="text-sm text-text-dark/60">The producer profile you are searching for does not exist.</p>
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-primary-green hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  // Distance only exists when the visitor actually shared location —
  // distances stay hidden instead of being measured from a place they are not.
  const distance = userCoords
    ? calculateDistance(userCoords.lat, userCoords.lng, seller.lat, seller.lng)
    : null;

  // Prefilled WhatsApp message text
  const waMessageText = encodeURIComponent(
    `Hello ${seller.business_name}, I saw your story on MADETRUE and would love to support your products!`
  );
  // Remove spaces or non-numeric formatting for WhatsApp link
  const formattedPhone = seller.whatsapp_number.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${waMessageText}`;

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Profile Card & Info */}
          <div className="lg:col-span-4 bg-[#FAF7F2] rounded-3xl border border-warm-brown/10 p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-cream-bg shadow-md">
                <img
                  src={seller.profile_photo_url}
                  alt={seller.business_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-center space-x-1.5">
                  <h1 className="font-serif text-2xl font-bold text-text-dark">{seller.business_name}</h1>
                  {seller.is_verified && (
                    <span title="Verified Producer">
                      <CheckCircle2 className="h-5 w-5 text-primary-green fill-primary-green/10" />
                    </span>
                  )}
                </div>
                <DistanceBadge
                  distance={distance}
                  lat={seller.lat}
                  lng={seller.lng}
                  address={seller.address}
                  size="md"
                />
              </div>
            </div>

            <div className="border-t border-warm-brown/5 pt-4 space-y-3">
              <div className="flex items-start text-xs leading-relaxed text-text-dark/70">
                <MapPin className="h-4 w-4 mr-2 text-primary-green flex-shrink-0 mt-0.5" />
                <span>{seller.address}</span>
              </div>
            </div>

            {/* Direct Connect CTA */}
            <div className="pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-4 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white text-sm font-bold rounded-xl shadow-sm hover:shadow transition duration-200"
              >
                <MessageCircle className="h-4.5 w-4.5 mr-2 fill-white" />
                <span>Support this Seller</span>
              </a>
              <p className="text-[10px] text-center text-text-dark/50 mt-2">
                Opens WhatsApp to chat directly with {seller.business_name.split("'")[0]}
              </p>
            </div>
          </div>

          {/* Maker Story & Products */}
          <div className="lg:col-span-8 space-y-10">
            {/* Story */}
            <div className="bg-[#FAF7F2] rounded-3xl border border-warm-brown/10 p-8 space-y-4">
              <h2 className="font-serif text-2xl font-bold text-text-dark">Our Story</h2>
              <p className="font-serif text-lg leading-relaxed text-text-dark/85 italic border-l-4 border-accent-gold/40 pl-4">
                &ldquo;{seller.story}&rdquo;
              </p>
            </div>

            {/* Find This Maker */}
            <div className="bg-[#FAF7F2] rounded-3xl border border-warm-brown/10 p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="font-serif text-2xl font-bold text-text-dark">
                  Find this Maker
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <DistanceBadge
                    distance={distance}
                    lat={seller.lat}
                    lng={seller.lng}
                    address={seller.address}
                    size="md"
                  />
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${seller.lat},${seller.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-xl border border-primary-green text-sm font-semibold text-primary-green hover:bg-primary-green hover:text-cream-bg transition duration-200"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Get directions
                  </a>
                </div>
              </div>

              {locError && (
                <div className="p-4 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-start space-x-2.5">
                  <AlertCircle className="h-5 w-5 text-warm-brown flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-text-dark/80 leading-relaxed">
                    {locError}
                  </span>
                </div>
              )}

              <SellerMap
                className="h-[320px] sm:h-[400px] rounded-2xl overflow-hidden border border-warm-brown/10 shadow-sm bg-primary-green/5"
                name={seller.business_name}
                lat={seller.lat}
                lng={seller.lng}
                userLocation={userCoords}
              />

              <div className="flex items-start text-sm leading-relaxed text-text-dark/70">
                <MapPin className="h-4 w-4 mr-2 text-primary-green flex-shrink-0 mt-0.5" />
                <span>{seller.address}</span>
              </div>
            </div>

            {/* Products Grid */}
            <div className="space-y-6">
              <h2 className="font-serif text-2xl font-bold text-text-dark">Products from this Kitchen/Farm</h2>
              {products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="group bg-[#FAF7F2] rounded-2xl border border-warm-brown/10 hover:border-primary-green/30 hover:shadow-md transition duration-300 flex flex-col justify-between overflow-hidden"
                    >
                      <div className="relative aspect-square overflow-hidden bg-primary-green/5 border-b border-warm-brown/5">
                        <Link href={`/products/${product.id}`} className="block h-full w-full">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        </Link>
                        {/* Badges container */}
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
                        <button className="absolute top-3 right-3 p-1.5 rounded-full bg-cream-bg/80 hover:bg-cream-bg text-text-dark hover:text-red-500 shadow-sm transition">
                          <Heart className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                          {product.tags.map((tag) => (
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

                      <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
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
                          <p className="text-xs text-text-dark/70 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-warm-brown/5 flex items-center justify-between gap-4">
                          <Link
                            href={`/products/${product.id}`}
                            className="text-xs font-bold text-warm-brown hover:text-primary-green transition"
                          >
                            Product Details
                          </Link>
                          {product.stock === 0 || !product.is_available ? (
                            <button
                              disabled
                              className="flex items-center justify-center p-2 rounded-xl bg-gray-200 text-gray-400 cursor-not-allowed"
                              title="Sold Out"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(product)}
                              title={
                                cappedProductId === product.id
                                  ? "Basket already holds every unit in stock"
                                  : "Add to Basket"
                              }
                              className={`flex items-center justify-center p-2 rounded-xl transition duration-200 ${addedProductId === product.id
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
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-dark/60 italic">No products listed currently by this maker.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
