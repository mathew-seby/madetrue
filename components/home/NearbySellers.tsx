"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getSellers } from "@/lib/supabase/client";
import { Seller } from "@/types";
import { calculateDistance, formatDistance } from "@/lib/utils/distance";
import { useUserLocation } from "@/lib/hooks/useUserLocation";
import DistanceBadge from "@/components/map/DistanceBadge";
import { Locate, AlertCircle } from "lucide-react";

// Leaflet touches `window` on import — client-only, never seeing the server
const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-primary-green/10" />
  ),
});

// Default location centered in Kochi, Kerala — the honest stand-in when a
// visitor hasn't shared location: the map opens here and cards sort from
// here, and the alert under the header says exactly that.
const DEFAULT_LAT = 9.9816;
const DEFAULT_LNG = 76.2999;

export default function NearbySellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const { userCoords, locating, locError, requestLocation } = useUserLocation({
    fallbackNote:
      "Meanwhile, makers are ordered by distance from the Kochi centre.",
  });

  useEffect(() => {
    async function load() {
      const data = await getSellers();
      setSellers(data);
    }
    load();
  }, []);

  const centerLat = userCoords?.lat ?? DEFAULT_LAT;
  const centerLng = userCoords?.lng ?? DEFAULT_LNG;

  // Calculate and sort sellers by distance
  const sortedSellers = [...sellers]
    .map((seller) => {
      const dist = calculateDistance(centerLat, centerLng, seller.lat, seller.lng);
      return { ...seller, distance: dist };
    })
    .sort((a, b) => a.distance - b.distance);

  return (
    <section className="bg-cream-bg py-16 px-4 sm:px-6 lg:px-8 border-t border-warm-brown/5">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-text-dark">
              Sellers Near You
            </h2>
            <p className="text-sm text-text-dark/70 max-w-lg leading-relaxed">
              Supporting your local community begins right around the corner. Discover makers sorted by proximity.
            </p>
          </div>

          {/* Locate Button */}
          <div>
            <button
              onClick={requestLocation}
              disabled={locating}
              className="inline-flex items-center px-4.5 py-2.5 rounded-xl border border-primary-green text-sm font-semibold text-primary-green hover:bg-primary-green hover:text-cream-bg transition duration-200"
            >
              <Locate className={`h-4 w-4 mr-2 ${locating ? "animate-spin" : ""}`} />
              <span>{userCoords ? "Recalculate Proximity" : "Find Nearby Sellers"}</span>
            </button>
          </div>
        </div>

        {/* Location Alerts */}
        {locError && (
          <div className="p-4 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-start space-x-2.5 max-w-xl">
            <AlertCircle className="h-5 w-5 text-warm-brown flex-shrink-0 mt-0.5" />
            <span className="text-xs text-text-dark/80 leading-relaxed">{locError}</span>
          </div>
        )}

        {/* The map itself — auto-fits the maker set plus the visitor's own pin */}
        <div className="relative h-[320px] sm:h-[400px] rounded-2xl overflow-hidden border border-warm-brown/10 shadow-sm bg-primary-green/5">
          {sortedSellers.length > 0 ? (
            <MapCanvas
              className="h-full w-full"
              center={[centerLat, centerLng]}
              markers={sortedSellers.map((seller) => ({
                id: seller.id,
                lat: seller.lat,
                lng: seller.lng,
                title: seller.business_name,
                subtitle: `${formatDistance(seller.distance)} away`,
                href: `/sellers/${seller.id}`,
              }))}
              userLocation={
                userCoords
                  ? { lat: userCoords.lat, lng: userCoords.lng }
                  : undefined
              }
            />
          ) : (
            <div
              className="h-full w-full animate-pulse bg-primary-green/10"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Nearby Sellers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sortedSellers.map((seller) => {
            return (
              <div
                key={seller.id}
                className="bg-[#FAF7F2] rounded-2xl border border-warm-brown/10 hover:border-primary-green/30 hover:shadow-md transition duration-300 flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Image and Distance Badge */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-primary-green/5 border border-warm-brown/5">
                    <img
                      src={seller.profile_photo_url}
                      alt={seller.business_name}
                      className="w-full h-full object-cover"
                    />
                    <DistanceBadge
                      className="absolute top-3 left-3"
                      distance={seller.distance}
                      lat={seller.lat}
                      lng={seller.lng}
                      address={seller.address}
                    />
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <h3 className="font-serif text-base font-bold text-text-dark leading-snug">
                      {seller.business_name}
                    </h3>
                    <p className="text-xs text-text-dark/60 line-clamp-1">
                      {seller.address}
                    </p>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="px-5 pb-5 pt-3 border-t border-warm-brown/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-warm-brown tracking-wider">
                    {seller.is_verified ? "Verified Producer" : "Local Maker"}
                  </span>
                  <Link
                    href={`/sellers/${seller.id}`}
                    className="text-xs font-bold text-primary-green hover:underline"
                  >
                    View Store
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
