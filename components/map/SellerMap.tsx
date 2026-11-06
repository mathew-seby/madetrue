"use client";

import dynamic from "next/dynamic";
import type { MapUserLocation } from "./MapCanvas";

// Leaflet touches `window` on import — client-only, never seeing the server
const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-primary-green/10" />
  ),
});

export interface SellerMapProps {
  /** The maker's display name — titles their pin */
  name: string;
  lat: number;
  lng: number;
  /** The visitor's location, only when honestly known (absent = no user pin) */
  userLocation?: MapUserLocation | null;
  /** Classes for the wrapper — the parent owns the height */
  className?: string;
}

/**
 * A single maker's storefront, framed at shop level instead of the district
 * view the nearby map uses — and when the visitor shares location, their pin
 * is pulled into the same frame so the relationship reads at a glance.
 */
export default function SellerMap({
  name,
  lat,
  lng,
  userLocation,
  className = "",
}: SellerMapProps) {
  return (
    <div className={className}>
      <MapCanvas
        className="h-full w-full"
        center={[lat, lng]}
        zoom={14}
        fitMaxZoom={14}
        markers={[{ id: "maker-pin", lat, lng, title: name }]}
        userLocation={userLocation ?? undefined}
      />
    </div>
  );
}
