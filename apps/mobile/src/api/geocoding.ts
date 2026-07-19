import { GEOCODING_URL } from "../config";

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

// Degrees of longitude/latitude (~55km) used to build a soft search bias box around the
// searcher -- without this, Nominatim ranks purely by global "importance" (Wikipedia-derived),
// so a query like "Bhive Whitefield" can easily lose to an unrelated, more "important" place
// elsewhere in the world instead of the actual nearby location.
const NEARBY_BIAS_DEGREES = 0.5;

export async function searchPlaces(query: string, near?: [number, number]): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    format: "json",
    limit: "10",
    q: query,
    // Nominatim collapses similar/same-brand results by default (dedupe=1), which can hide other
    // branches of a chain -- e.g. searching "Bhive" should be able to surface every BHIVE branch,
    // not just one.
    dedupe: "0",
  });
  if (near) {
    const [lng, lat] = near;
    params.set(
      "viewbox",
      [lng - NEARBY_BIAS_DEGREES, lat + NEARBY_BIAS_DEGREES, lng + NEARBY_BIAS_DEGREES, lat - NEARBY_BIAS_DEGREES].join(
        ",",
      ),
    );
    // Soft bias (default) rather than a hard filter -- prefer nearby matches without hiding a
    // genuine faraway result if that's really what the user typed.
    params.set("bounded", "0");
  }
  const res = await fetch(`${GEOCODING_URL}/search?${params.toString()}`, {
    headers: { "User-Agent": "Orbit (self-hosted location-sharing app)" },
  });
  if (!res.ok) throw new Error("Search failed");
  const results: NominatimResult[] = await res.json();
  const parsed = results.map((r) => ({
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));

  if (!near) return parsed;
  // Nominatim's own ranking is importance-based, not distance-based, so even with a viewbox bias
  // the closest match isn't guaranteed to sort first -- enforce that client-side. A squared planar
  // distance is enough for ordering purposes at this ~55km scale (no need for haversine).
  const [nearLng, nearLat] = near;
  return parsed.sort((a, b) => {
    const da = (a.lng - nearLng) ** 2 + (a.lat - nearLat) ** 2;
    const db = (b.lng - nearLng) ** 2 + (b.lat - nearLat) ** 2;
    return da - db;
  });
}
