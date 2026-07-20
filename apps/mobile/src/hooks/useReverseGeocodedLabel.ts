import { useEffect, useState } from "react";
import { reverseGeocode } from "../api/geocoding";

// Module-level (not per-hook-instance) so every row sharing roughly the same spot -- or the same
// member re-rendering on a fresh ping a few meters away -- reuses one lookup instead of hammering
// the free Photon endpoint on every SSE update.
const cache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

// ~111m grid at the equator -- coarse enough to dedupe near-identical pings, fine enough that the
// label still matches where the person actually is.
function keyFor(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export function useReverseGeocodedLabel(lat: number | undefined, lng: number | undefined): string | null {
  const key = lat !== undefined && lng !== undefined ? keyFor(lat, lng) : undefined;
  const [label, setLabel] = useState<string | null>(key !== undefined ? (cache.get(key) ?? null) : null);

  useEffect(() => {
    if (key === undefined || lat === undefined || lng === undefined) return;
    if (cache.has(key)) {
      setLabel(cache.get(key) ?? null);
      return;
    }

    let isMounted = true;
    let promise = inFlight.get(key);
    if (!promise) {
      promise = reverseGeocode(lat, lng).catch(() => null);
      inFlight.set(key, promise);
    }
    promise.then((result) => {
      cache.set(key, result);
      inFlight.delete(key);
      if (isMounted) setLabel(result);
    });

    return () => {
      isMounted = false;
    };
  }, [key]);

  return label;
}
