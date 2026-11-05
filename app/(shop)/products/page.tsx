"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getProducts, getCategories, getSellers } from "@/lib/supabase/client";
import { isAtBasketCap, useCart } from "@/components/shared/CartProvider";
import { Product, Seller, Category } from "@/types";
import { calculateDistance, formatDistance } from "@/lib/utils/distance";
import { Search, MapPin, Store, ShoppingCart, Heart, SlidersHorizontal, Check, X } from "lucide-react";

// Default location (Kochi, Kerala)
const DEFAULT_LAT = 9.9816;
const DEFAULT_LNG = 76.2999;

function ProductListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<{ [key: string]: Seller }>({});
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [cappedProductId, setCappedProductId] = useState<string | null>(null);

  // Filter & Sort States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

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

  // Load static data
  useEffect(() => {
    async function loadData() {
      const cats = await getCategories();
      const sers = await getSellers();
      const sellerMap = sers.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {} as { [key: string]: Seller });

      setCategories(cats);
      setSellers(sellerMap);
    }
    loadData();

    // Check browser location if permitted
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Fallback silently to Kochi
          setUserCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        }
      );
    }
  }, []);

  // Update selectedCategory if URL search parameter changes
  useEffect(() => {
    setSelectedCategory(searchParams.get("category") || "");
  }, [searchParams]);

  // Query and filter products on state change
  useEffect(() => {
    async function filterProducts() {
      const data = await getProducts({
        category: selectedCategory || undefined,
        search: search || undefined,
        sortBy: sortBy as any,
      });
      setProducts(data);
    }
    filterProducts();
  }, [selectedCategory, search, sortBy]);

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    // Sync to URL query param
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("category", slug);
    } else {
      params.delete("category");
    }
    router.push(`/products?${params.toString()}`);
  };

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

  // User location for distance metrics
  const centerLat = userCoords?.lat ?? DEFAULT_LAT;
  const centerLng = userCoords?.lng ?? DEFAULT_LNG;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-dark">Explore Local Goods</h1>
        <p className="text-sm text-text-dark/70 leading-relaxed max-w-xl">
          Freshest yields, traditional food, and handcrafts directly from regional families in Kerala.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search */}
          <div className="relative md:col-span-6">
            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-text-dark/50" />
            <input
              type="text"
              placeholder="Search spices, homemade honey, clay pots..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10.5 pr-4 py-3 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark placeholder-text-dark/50 focus:border-primary-green focus:ring-0 focus:outline-none transition"
            />
          </div>

          {/* Sort */}
          <div className="relative md:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition appearance-none cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <div className="absolute right-4 top-4.5 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-text-dark/60" />
          </div>

          {/* User Location Indicator */}
          <div className="md:col-span-3 flex items-center justify-end text-xs text-warm-brown font-semibold space-x-1.5">
            <MapPin className="h-4 w-4 text-primary-green" />
            <span>Kochi, Kerala (within 15km)</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => handleCategoryChange("")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${
              !selectedCategory
                ? "bg-primary-green text-cream-bg shadow-sm"
                : "bg-cream-bg text-text-dark/80 border border-warm-brown/10 hover:border-warm-brown/40"
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${
                selectedCategory === cat.slug
                  ? "bg-primary-green text-cream-bg shadow-sm"
                  : "bg-cream-bg text-text-dark/80 border border-warm-brown/10 hover:border-warm-brown/40"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const seller = sellers[product.seller_id];
            const distance = seller
              ? calculateDistance(centerLat, centerLng, seller.lat, seller.lng)
              : null;

            return (
              <div
                key={product.id}
                className="group bg-[#FAF7F2] rounded-2xl border border-warm-brown/10 hover:border-primary-green/30 hover:shadow-lg transition duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Image and badges */}
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
                    {distance !== null && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-cream-bg/95 text-[9px] font-bold text-warm-brown shadow-sm border border-warm-brown/10">
                        <MapPin className="h-2.5 w-2.5 mr-0.5 text-primary-green" />
                        <span>{formatDistance(distance)}</span>
                      </div>
                    )}
                    {product.stock > 0 && product.stock <= 2 && product.is_available && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-white text-[8px] font-bold uppercase tracking-wider animate-pulse shadow-sm font-sans">
                        ⚠️ Only {product.stock} Left!
                      </div>
                    )}
                  </div>
                  {/* Sold out overlay */}
                  {(product.stock === 0 || !product.is_available) && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-10">
                      <span className="text-white text-xs font-bold uppercase tracking-widest border border-white/30 px-3 py-1 rounded-lg font-sans">Sold Out</span>
                    </div>
                  )}
                  {/* Favorite */}
                  <button className="absolute top-3 right-3 p-1.5 rounded-full bg-cream-bg/80 hover:bg-cream-bg text-text-dark hover:text-red-500 shadow-sm transition">
                    <Heart className="h-4 w-4" />
                  </button>
                  {/* Tags */}
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
                    {seller && (
                      <Link
                        href={`/sellers/${seller.id}`}
                        className="inline-flex items-center text-[11px] font-semibold text-warm-brown hover:text-primary-green transition"
                      >
                        <Store className="h-3 w-3 mr-1 text-primary-green" />
                        <span>{seller.business_name}</span>
                      </Link>
                    )}
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
                      className="text-[11px] font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider"
                    >
                      Meet the Maker
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
                        className={`flex items-center justify-center p-2 rounded-xl transition duration-200 ${
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
      ) : (
        <div className="text-center py-16 bg-[#FAF7F2] rounded-3xl border border-warm-brown/10 space-y-3">
          <SlidersHorizontal className="h-8 w-8 text-warm-brown/50 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-text-dark">No Products Found</h3>
          <p className="text-sm text-text-dark/60 max-w-sm mx-auto leading-relaxed">
            We couldn't find any local goods matching your criteria. Try adjusting your search query or switching categories.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ProductListingPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm text-warm-brown font-medium">
        Loading local store catalog...
      </div>
    }>
      <ProductListingContent />
    </Suspense>
  );
}
