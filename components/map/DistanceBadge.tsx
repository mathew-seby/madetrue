import { Navigation, MapPinOff } from "lucide-react";
import { formatDistance, isInErnakulam } from "@/lib/utils/distance";

export interface DistanceBadgeProps {
  /** Genuinely-measured distance in km — unknown (null) renders nothing */
  distance?: number | null;
  /** The maker's coordinates — feed the Ernakulam honesty gate */
  lat: number;
  lng: number;
  /** The maker's address — the gate also screens out-of-district town names */
  address?: string;
  /** "sm" fits card corners (10px); "md" suits inline rows (xs) */
  size?: "sm" | "md";
  /** Extra classes, e.g. the parent's absolute positioning */
  className?: string;
}

/**
 * Distance and hyperlocal honesty in one small pill. Every map-adjacent
 * surface renders this component — identical strings everywhere, and when a
 * maker sits outside the Ernakulam district the badge says so plainly
 * ("delivery unavailable") instead of a distance the brand can't fulfil on.
 */
export default function DistanceBadge({
  distance,
  lat,
  lng,
  address,
  size = "sm",
  className = "",
}: DistanceBadgeProps) {
  const base = `inline-flex items-center rounded-full font-bold tracking-wide shadow-sm ${
    size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-xs"
  } ${className}`;

  // The gate wins over any distance: the hyperlocal promise is the point.
  if (!isInErnakulam(lat, lng, address)) {
    return (
      <span className={`${base} bg-accent-gold text-warm-brown`}>
        <MapPinOff className="h-3 w-3 mr-1 flex-shrink-0" />
        <span>Outside Ernakulam — delivery unavailable</span>
      </span>
    );
  }

  // No fabrication: without a real measurement there is no badge.
  if (typeof distance !== "number") {
    return null;
  }

  return (
    <span className={`${base} bg-primary-green text-cream-bg`}>
      <Navigation className="h-3 w-3 mr-1 fill-cream-bg flex-shrink-0" />
      <span>{formatDistance(distance)} away</span>
    </span>
  );
}
