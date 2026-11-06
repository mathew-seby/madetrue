"use client";

import { useCallback, useState } from "react";

export interface UserCoords {
  lat: number;
  lng: number;
}

interface UseUserLocationOptions {
  /**
   * An honest sentence appended to every failure message, so the visitor
   * knows what happens next — e.g. what the distances on screen are based on.
   */
  fallbackNote?: string;
}

// Specific, warm, actionable — never vague (per the repo's copy rules).
const BASE_MESSAGES: Record<number, string> = {
  // 1 — PERMISSION_DENIED
  1: "Location is blocked for this site. You can allow it in your browser's site settings.",
  // 2 — POSITION_UNAVAILABLE
  2: "Your device could not find a location right now.",
  // 3 — TIMEOUT
  3: "Finding you took a bit too long. Try again?",
};

const UNSUPPORTED_MESSAGE = "Your browser cannot share your location.";

/**
 * One honest geolocation flow for every map on the site.
 *
 * On failure it never pretends: `userCoords` stays null, so nothing on the
 * page poses a Kochi default as the visitor's location. Distances simply stay
 * hidden and `locError` explains why — with an optional `fallbackNote` so each
 * surface can say what its numbers are based on instead.
 */
export function useUserLocation(options: UseUserLocationOptions = {}) {
  const { fallbackNote } = options;
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocError(UNSUPPORTED_MESSAGE);
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
        // A GeolocationPositionError serializes as {} in the console (its
        // properties are non-enumerable) — log the code and message instead.
        // Level `warn`, not `error`: a visitor declining location is not a bug.
        console.warn("[geolocation]", error.code, error.message);
        const base =
          BASE_MESSAGES[error.code] ?? "We could not get your location.";
        setLocError(fallbackNote ? `${base} ${fallbackNote}` : base);
        // No fake pin: success is the only way `userCoords` becomes truthy.
        setUserCoords(null);
        setLocating(false);
      },
      // Coarse accuracy is plenty for "nearby" sorting; a tight 5 s timeout on
      // a GPS-grade request only ever produced desktop timeouts.
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, [fallbackNote]);

  return { userCoords, locating, locError, requestLocation };
}
