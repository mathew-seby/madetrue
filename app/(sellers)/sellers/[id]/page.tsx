import Link from "next/link";
import { getSellerById, getProductsBySellerId } from "@/lib/supabase/client";
import SellerMap from "@/components/map/SellerMap";
import ProductDistanceBadge from "@/components/product/ProductDistanceBadge";
import AddToCartButton from "@/components/product/AddToCartButton";
import {
  MapPin,
  CheckCircle2,
  MessageCircle,
  ArrowLeft,
  Navigation,
} from "lucide-react";

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

export default async function SellerProfilePage({ params }: PageProps) {
  const { id } = await params;

  const [seller, products] = await Promise.all([
    getSellerById(id),
    getProductsBySellerId(id),
  ]);

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

  // Prefilled WhatsApp message text
  const waMessageText = encodeURIComponent(
    `Hello ${seller.business_name}, I saw your story on MADETRUE and would love to support your products!`
  );
  const formattedPhone = seller.whatsapp_number.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${waMessageText}`;

  return (
    <div className="bg-cream-bg min-h-screen pb-16">
      {/* Cover / Breadcrumb */}
      <div className="bg-gradient-to-r from-primary-green/10 to-warm-brown/10 py-6 border-b border-warm-brown/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Profile Header Box */}
        <div className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-10 border border-warm-brown/10 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
            {/* Photo with Distance Badge Island */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white shadow-md bg-primary-green/10">
                <img
                  src={seller.profile_photo_url}
                  alt={seller.business_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2 -right-2">
                <ProductDistanceBadge
                  lat={seller.lat}
                  lng={seller.lng}
                  address={seller.address}
                />
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-4 text-center md:text-left flex-grow">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-dark">
                    {seller.business_name}
                  </h1>
                  {seller.is_verified && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-green/10 text-primary-green">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Verified Maker
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center md:justify-start text-sm text-text-dark/70 pt-1">
                  <MapPin className="h-4 w-4 mr-1 text-primary-green shrink-0" />
                  <span>{seller.address}</span>
                </div>
              </div>

              {/* Story */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-bold tracking-wider text-warm-brown">
                  Our Story &amp; Philosophy
                </h3>
                <p className="text-sm sm:text-base text-text-dark/85 leading-relaxed italic border-l-2 border-accent-gold/40 pl-4 py-1">
                  &ldquo;{seller.story}&rdquo;
                </p>
              </div>

              {/* Direct Actions: WhatsApp Order / Inquiry */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary-green text-cream-bg font-semibold text-xs tracking-wider uppercase hover:bg-[#224f3b] shadow-sm transition duration-200"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Location & Map Section */}
        <div className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-8 border border-warm-brown/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-brown/10 pb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-warm-brown tracking-wider">
                Maker Location
              </span>
              <h3 className="font-serif text-xl font-bold text-text-dark">
                Where your food &amp; crafts are made
              </h3>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${seller.lat},${seller.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-semibold text-primary-green hover:underline gap-1"
            >
              <Navigation className="h-3.5 w-3.5" />
              Get Directions on Google Maps
            </a>
          </div>

          <SellerMap
            className="h-[240px] sm:h-[300px] rounded-2xl overflow-hidden border border-warm-brown/10 shadow-sm bg-primary-green/5"
            name={seller.business_name}
            lat={seller.lat}
            lng={seller.lng}
          />
        </div>

        {/* Products by this Maker */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-warm-brown tracking-wider">
                Local Harvest &amp; Handcrafts
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-dark mt-1">
                Products from {seller.business_name}
              </h2>
            </div>
            <span className="text-xs font-semibold text-text-dark/60">
              {products.length} {products.length === 1 ? "Item" : "Items"} Listed
            </span>
          </div>

          {products.length === 0 ? (
            <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-warm-brown/10 text-sm text-text-dark/60">
              This maker hasn&apos;t listed any active products yet. Check back soon!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-warm-brown/10 overflow-hidden flex flex-col justify-between hover:shadow-md transition duration-200 group"
                  >
                    <div>
                      {/* Image */}
                      <div className="relative aspect-square overflow-hidden bg-primary-green/5 border-b border-warm-brown/5">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        {/* Tags */}
                        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                          {product.tags.slice(0, 1).map((tag) => (
                            <span
                              key={tag}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getBadgeStyle(
                                tag
                              )}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <Link
                          href={`/products/${product.id}`}
                          className="font-serif text-base font-bold text-text-dark hover:text-primary-green transition line-clamp-1 block"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-text-dark/70 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 pt-0 border-t border-warm-brown/5 flex items-center justify-between">
                      <span className="font-serif text-base font-bold text-primary-green">
                        ₹{product.price}
                      </span>
                      <AddToCartButton product={product} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
