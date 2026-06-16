"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSellers } from "@/lib/supabase/client";
import { Seller } from "@/types";
import { calculateDistance, formatDistance } from "@/lib/utils/distance";
import { MapPin, Navigation, Locate, AlertCircle } from "lucide-react";

// Default location centered in Kochi, Kerala
const DEFAULT_LAT = 9.9816;
const DEFAULT_LNG = 76.2999;

export default function NearbySellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getSellers();
      setSellers(data);
    }
    load();
  }, []);

  // Use browser Geolocation to get actual location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      (error) => {
        console.error("Error getting location: ", error);
        setLocError("Could not access your location. Using Kochi center as default.");
        setUserCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

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

        {/* Nearby Sellers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sortedSellers.map((seller) => {
            const displayDist = formatDistance(seller.distance);
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
                    <div className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-primary-green text-cream-bg text-[10px] font-bold tracking-wide shadow-sm">
                      <Navigation className="h-3 w-3 mr-1 fill-cream-bg" />
                      <span>{displayDist} away</span>
                    </div>
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
