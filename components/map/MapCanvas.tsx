"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

export interface MapCanvasProps {
  /** Pins to show on the map */
  markers: MapMarker[];
  /** [lat, lng] the map starts centered on */
  center: [number, number];
  /** Leaflet zoom level — 11 is a city view (default) */
  zoom?: number;
  /** Whether the mouse wheel zooms the map. Off by default so scrolling
   *  past the map never hijacks the page. */
  wheelZoom?: boolean;
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

export default function MapCanvas({
  markers,
  center,
  zoom = 11,
  wheelZoom = false,
  className = "",
}: MapCanvasProps) {
  return (
    <div className={className}>
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
                  <a
                    href={marker.href}
                    className="text-xs font-bold text-primary-green hover:underline"
                  >
                    {marker.hrefLabel ?? "View Store"} →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
