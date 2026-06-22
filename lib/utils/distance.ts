export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
}

export function isInErnakulam(lat: number, lng: number, address?: string): boolean {
  if (address) {
    const addrLower = address.toLowerCase();
    const otherDistricts = [
      "alappuzha", "idukki", "kottayam", "pathanamthitta", "kollam", 
      "thiruvananthapuram", "trivandrum", "thrissur", "palakkad", 
      "malappuram", "kozhikode", "wayanad", "kannur", "kasaragod"
    ];
    for (const district of otherDistricts) {
      if (addrLower.includes(district)) {
        // Double check it doesn't just mention "Ernakulam" or "Kochi" as a transit address or comparison
        // But if it explicitly says e.g. "Pulpally, Wayanad", it is Wayanad.
        return false;
      }
    }
  }

  // Bounding box of Ernakulam district: Lat [9.77, 10.30], Lng [76.16, 77.09]
  const minLat = 9.77;
  const maxLat = 10.30;
  const minLng = 76.16;
  const maxLng = 77.09;

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

export function parseGoogleMapsUrl(input: string): { lat: number; lng: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Check for @latitude,longitude format (found in standard Google Maps browser URLs)
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 2. Check for query parameters q=latitude,longitude or query=latitude,longitude
  const qMatch = trimmed.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) || trimmed.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 3. Check for simple raw coordinates input (e.g., "9.9312, 76.2673" or "9.9312,76.2673")
  const rawMatch = trimmed.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  return null;
}
