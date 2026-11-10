import Link from "next/link";
import { getProductById, getSellerById, getProductsBySellerId } from "@/lib/supabase/client";
import SellerMap from "@/components/map/SellerMap";
import ProductOrderActions from "@/components/product/ProductOrderActions";
import ProductDistanceBadge from "@/components/product/ProductDistanceBadge";
import { MapPin, Store, ArrowLeft, ShieldAlert, Sparkles, Navigation } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function getBadgeStyle(tag: string) {
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
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  const product = await getProductById(id);

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

  // Parallel fetch maker and sibling items
  const [seller, siblingProducts] = await Promise.all([
    getSellerById(product.seller_id),
    getProductsBySellerId(product.seller_id),
  ]);

  const makerProducts = siblingProducts
    .filter((p) => p.id !== product.id && p.is_available && !p.is_hidden)
    .slice(0, 3);

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
            {seller && (
              <div className="absolute top-4 left-4">
                <ProductDistanceBadge
                  lat={seller.lat}
                  lng={seller.lng}
                  address={seller.address}
                />
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
              <Sparkles className="h-5 w-5 text-primary-green shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-green">
                  Origin & Raw Details
                </h4>
                <p className="text-xs text-text-dark/80 leading-relaxed">
                  {product.origin_details}
                </p>
              </div>
            </div>

            {/* Stock Alert Banner */}
            {product.stock > 0 && product.stock <= 2 && product.is_available && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2 animate-pulse font-sans">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0" />
                <span>Limited Stock: Only {product.stock} left in stock. Secure yours today!</span>
              </div>
            )}
            {(product.stock === 0 || !product.is_available) && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2 font-sans">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0" />
                <span>Out of Stock: This local product is currently sold out.</span>
              </div>
            )}

            {/* Quantity and Order Panel Island */}
            <div className="pt-4 border-t border-warm-brown/5">
              <ProductOrderActions product={product} />
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
                  &ldquo;{seller.story.substring(0, 220)}...&rdquo;
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

            {/* Location strip — where this actually comes from */}
            <div className="border-t border-warm-brown/5 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              <SellerMap
                className="h-[200px] sm:h-[220px] rounded-2xl overflow-hidden border border-warm-brown/10 shadow-sm bg-primary-green/5"
                name={seller.business_name}
                lat={seller.lat}
                lng={seller.lng}
                href={`/sellers/${seller.id}`}
                hrefLabel="Visit maker's store"
              />
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-warm-brown tracking-wider">
                  Where this comes from
                </span>
                <div className="flex items-start text-sm leading-relaxed text-text-dark/70">
                  <MapPin className="h-4 w-4 mr-2 text-primary-green shrink-0 mt-0.5" />
                  <span>{seller.address}</span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${seller.lat},${seller.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center w-fit px-3 py-1.5 rounded-xl border border-primary-green text-xs font-semibold text-primary-green hover:bg-primary-green hover:text-cream-bg transition duration-200"
                >
                  <Navigation className="h-3.5 w-3.5 mr-2" />
                  Get directions
                </a>
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
