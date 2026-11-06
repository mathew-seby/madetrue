"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  /** Small line under the title in the popup, e.g. "2.3 km away" */
  subtitle?: string;
  /** Where the popup CTA goes (e.g. the maker's store) */
  href?: string;
  /** Label for the popup CTA (defaults to "View Store") */
  hrefLabel?: string;
}

/** The visitor's own location, drawn as the distinct gold pin */
export interface MapUserLocation {
  lat: number;
  lng: number;
  /** Popup title on the user pin (defaults to "You are here") */
  label?: string;
}

export interface MapCanvasProps {
  /** Pins to show on the map */
  markers: MapMarker[];
  /** [lat, lng] first-frame center only — the map immediately auto-fits
   *  the marker set afterwards (see FitToPoints) */
  center: [number, number];
  /** Leaflet zoom level — 11 is a city view (default) */
  zoom?: number;
  /** Whether the mouse wheel zooms the map. Off by default so scrolling
   *  past the map never hijacks the page. */
  wheelZoom?: boolean;
  /** Upper bound while auto-fitting the pin set — 12 (a district view) by
   *  default; 13–16 for close-ups like a single maker's storefront */
  fitMaxZoom?: number;
  /** The visitor's shared location — shows their pin and pulls it into the fit */
  userLocation?: MapUserLocation;
  /** Classes for the wrapper — the parent owns the height */
  className?: string;
}

/**
 * The one shared Leaflet map surface. Always loaded client-only via
 * `dynamic(() => import(...), { ssr: false })` from consumers — Leaflet
 * touches `window` on import, so it must never render on the server.
 *
 * Tiles are OpenStreetMap (free, no keys). Their usage policy requires
 * keeping the attribution visible, which the TileLayer below does.
 *
 * The default Leaflet pin images break under bundlers, so we don't use
 * them at all — the pin below is a hand-drawn brand marker (inline SVG),
 * which also keeps the map free of Google-style defaults.
 */
const MAKER_PIN = L.divIcon({
  // NOT the default "leaflet-div-icon" class — that one paints a white
  // box and a border around the pin.
  className: "madetrue-pin",
  iconSize: [30, 38],
  // The tip of the pin sits exactly on the coordinate
  iconAnchor: [15, 36],
  popupAnchor: [0, -32],
  html: `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 1C8.4 1 3 6.39 3 12.99C3 21.49 15 37 15 37C15 37 27 21.49 27 12.99C27 6.39 21.6 1 15 1Z" fill="#2D6A4F"/><circle cx="15" cy="12.5" r="5" fill="#F9F5F0"/></svg>`,
});

/** The visitor's mark — gold with a white ring readably on any tile */
const USER_PIN = L.divIcon({
  className: "madetrue-user-pin",
  iconSize: [18, 18],
  // The center of the dot sits exactly on the coordinate
  iconAnchor: [9, 9],
  popupAnchor: [0, -11],
  html: `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="#E9A84C" stroke="#FFFFFF" stroke-width="2.5"/></svg>`,
});

/**
 * Keeps the whole pin set in view. Leaflet ignores `center` changes after
 * mount, so the fit is done by a child that reacts to the point set itself —
 * when a visitor shares their location, or more makers load, the frame pulls
 * everything in; every pan/zoom they do after that stays untouched.
 */
function FitToPoints({
  points,
  maxZoom = 12,
}: {
  points: Array<[number, number]>;
  maxZoom?: number;
}) {
  const map = useMap();
  // Refit only when a coordinate genuinely moved — compared as a string so
  // per-render array identities never trigger it.
  const frame = points.map((p) => `${p[0]},${p[1]}`).join("|");

  useEffect(() => {
    if (!frame) return;
    const parsed = frame
      .split("|")
      .map((set) => set.split(",").map(Number) as [number, number]);
    map.fitBounds(L.latLngBounds(parsed), {
      padding: [36, 36],
      maxZoom,
    });
  }, [frame, map, maxZoom]);

  return null;
}

export default function MapCanvas({
  markers,
  center,
  zoom = 11,
  wheelZoom = false,
  fitMaxZoom = 12,
  userLocation,
  className = "",
}: MapCanvasProps) {
  // The frame is built from whatever is on the map right now: maker pins
  // first, then the visitor's own location if they shared it.
  const fitPoints: Array<[number, number]> = [
    ...markers.map((m) => [m.lat, m.lng] as [number, number]),
    ...(userLocation
      ? ([[userLocation.lat, userLocation.lng]] as Array<[number, number]>)
      : []),
  ];

  return (
    // `relative` so the map surface and the legend chip share one overlay box
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={wheelZoom}
        // Inline height beats Leaflet's built-in `.leaflet-container { height: 300px }`
        // regardless of CSS import order — the parent decides the size.
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={fitPoints} maxZoom={fitMaxZoom} />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={MAKER_PIN}
          >
            <Popup maxWidth={240}>
              <div className="space-y-1">
                <p className="font-serif text-sm font-bold text-text-dark">
                  {marker.title}
                </p>
                {marker.subtitle && (
                  <p className="text-xs text-text-dark/60">{marker.subtitle}</p>
                )}
                {marker.href && (
                  <Link
                    href={marker.href}
                    className="text-xs font-bold text-primary-green hover:underline"
                  >
                    {marker.hrefLabel ?? "View Store"} →
                  </Link>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={USER_PIN}
          >
            <Popup maxWidth={220}>
              <div className="space-y-1">
                <p className="font-serif text-sm font-bold text-text-dark">
                  {userLocation.label ?? "You are here"}
                </p>
                <p className="text-xs text-text-dark/60">
                  Distances are measured from this point.
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Legend for the visitor's own pin — instant read, never blocks drags */}
      {userLocation && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1100] inline-flex items-center gap-1.5 rounded-full border border-warm-brown/10 bg-cream-bg/95 px-2.5 py-1 shadow-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border-2 border-white bg-accent-gold"
            aria-hidden="true"
          />
          <span className="text-[10px] font-bold uppercase tracking-wide text-warm-brown">
            You are here
          </span>
        </div>
      )}
    </div>
  );
}
