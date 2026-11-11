"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getProducts, getProductsCount, getCategories, getSellers, type ProductFilters } from "@/lib/supabase/client";
import { isAtBasketCap, useCart } from "@/components/shared/CartProvider";
import { Product, Seller, Category } from "@/types";
import { calculateDistance } from "@/lib/utils/distance";
import { useUserLocation } from "@/lib/hooks/useUserLocation";
import DistanceBadge from "@/components/map/DistanceBadge";
import { Search, MapPin, Store, ShoppingCart, Heart, SlidersHorizontal, Check, X, ChevronLeft, ChevronRight } from "lucide-react";

const PRODUCTS_PER_PAGE = 8;

function ProductListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";

  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<{ [key: string]: Seller }>({});
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [cappedProductId, setCappedProductId] = useState<string | null>(null);

  // Filter & Sort States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<ProductFilters["sortBy"]>("newest");

  const { addItem, items } = useCart();
  const { userCoords, locating, requestLocation } = useUserLocation();

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

    // Ask once so card distances are real — on a refusal the hook keeps
    // userCoords null and every distance badge simply stays hidden instead of
    // quietly measuring from a made-up Kochi position.
    requestLocation();
  }, [requestLocation]);

  // URL ↔ filter sync: local changes push the param to the URL (see
  // handleCategoryChange), while external param changes (back/forward nav,
  // direct links) update the filter. Done during render ("adjusting state"
  // pattern) instead of an effect so there is no cascading render.
  const categoryParam = searchParams.get("category") || "";
  const [lastCategoryParam, setLastCategoryParam] = useState(categoryParam);
  if (categoryParam !== lastCategoryParam) {
    setLastCategoryParam(categoryParam);
    setSelectedCategory(categoryParam);
  }

  // Query and filter products on state or page change
  useEffect(() => {
    let alive = true;
    async function filterProducts() {
      const filters = {
        category: selectedCategory || undefined,
        search: search.trim() || undefined,
        sortBy: sortBy,
      };

      const [data, total] = await Promise.all([
        getProducts({
          ...filters,
          limit: PRODUCTS_PER_PAGE,
          offset: (currentPage - 1) * PRODUCTS_PER_PAGE,
        }),
        getProductsCount(filters),
      ]);

      if (alive) {
        setProducts(data);
        setTotalCount(total);
      }
    }
    filterProducts();

    return () => {
      alive = false;
    };
  }, [selectedCategory, search, sortBy, currentPage]);

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    // Sync to URL query param and reset page to 1
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("category", slug);
    } else {
      params.delete("category");
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  const handleSortChange = (newSort: ProductFilters["sortBy"]) => {
    setSortBy(newSort);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE));

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      params.set("page", newPage.toString());
    } else {
      params.delete("page");
    }
    router.push(`/products?${params.toString()}`);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
              aria-label="Search local products"
              placeholder="Search spices, homemade honey, clay pots..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10.5 pr-4 py-3 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark placeholder-text-dark/50 focus:border-primary-green focus:ring-0 focus:outline-none transition"
            />
          </div>

          {/* Sort */}
          <div className="relative md:col-span-3">
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as ProductFilters["sortBy"])}
              className="w-full px-4 py-3 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition appearance-none cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <div className="absolute right-4 top-4.5 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-text-dark/60" />
          </div>

          {/* Location honesty: say what the distances are based on */}
          <div className="md:col-span-3 flex items-center justify-start md:justify-end text-xs font-semibold space-x-1.5">
            <MapPin className="h-4 w-4 text-primary-green" />
            {userCoords ? (
              <span className="text-warm-brown">Distances measured from your location</span>
            ) : locating ? (
              <span className="text-warm-brown">Finding your location…</span>
            ) : (
              <button
                onClick={requestLocation}
                className="text-primary-green hover:underline underline-offset-2 cursor-pointer"
              >
                Share location for real distances
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => handleCategoryChange("")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
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

      {/* Results Header / Counter */}
      <div className="flex items-center justify-between text-xs font-medium text-text-dark/65 font-sans px-1">
        <span>
          Showing {totalCount > 0 ? (currentPage - 1) * PRODUCTS_PER_PAGE + 1 : 0}–
          {Math.min(currentPage * PRODUCTS_PER_PAGE, totalCount)} of {totalCount} local products
        </span>
        {totalPages > 1 && (
          <span className="font-semibold text-primary-green">
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              const seller = sellers[product.seller_id];
              const distance =
                seller && userCoords
                  ? calculateDistance(userCoords.lat, userCoords.lng, seller.lat, seller.lng)
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
                        loading="lazy"
                        decoding="async"
                        width={400}
                        height={400}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </Link>
                    {/* Badges container */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                      {distance !== null && seller && (
                        <DistanceBadge
                          distance={distance}
                          lat={seller.lat}
                          lng={seller.lng}
                          address={seller.address}
                        />
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
                    <button
                      type="button"
                      aria-label={`Save ${product.name} to wishlist`}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-cream-bg/80 hover:bg-cream-bg text-text-dark hover:text-red-500 shadow-sm transition cursor-pointer"
                    >
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <nav
              aria-label="Product catalog pagination"
              className="pt-6 border-t border-warm-brown/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans"
            >
              <span className="text-xs text-text-dark/60">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  aria-label="Go to previous page"
                  className="px-3.5 py-2 rounded-xl border border-warm-brown/20 bg-cream-bg text-xs font-semibold text-text-dark hover:bg-warm-brown/10 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                <div className="flex items-center gap-1" role="group" aria-label="Page selection">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      aria-label={`Page ${pageNum}`}
                      aria-current={pageNum === currentPage ? "page" : undefined}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                        pageNum === currentPage
                          ? "bg-primary-green text-cream-bg shadow-sm"
                          : "bg-cream-bg text-text-dark/80 hover:bg-warm-brown/10 border border-warm-brown/15"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  aria-label="Go to next page"
                  className="px-3.5 py-2 rounded-xl border border-warm-brown/20 bg-cream-bg text-xs font-semibold text-text-dark hover:bg-warm-brown/10 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </nav>
          )}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#FAF7F2] rounded-3xl border border-warm-brown/10 space-y-3">
          <SlidersHorizontal className="h-8 w-8 text-warm-brown/50 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-text-dark">No Products Found</h3>
          <p className="text-sm text-text-dark/60 max-w-sm mx-auto leading-relaxed">
            We couldn&apos;t find any local goods matching your criteria. Try adjusting your search query or switching categories.
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
