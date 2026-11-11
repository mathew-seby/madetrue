"use client";

import { useEffect } from "react";
import { useUserLocation } from "@/lib/hooks/useUserLocation";
import { calculateDistance } from "@/lib/utils/distance";
import DistanceBadge from "@/components/map/DistanceBadge";

interface ProductDistanceBadgeProps {
  lat: number;
  lng: number;
  address: string;
}

export default function ProductDistanceBadge({
  lat,
  lng,
  address,
}: ProductDistanceBadgeProps) {
  const { userCoords, requestLocation } = useUserLocation();

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  if (!userCoords) return null;

  const distance = calculateDistance(userCoords.lat, userCoords.lng, lat, lng);

  return (
    <DistanceBadge
      distance={distance}
      lat={lat}
      lng={lng}
      address={address}
    />
  );
}

