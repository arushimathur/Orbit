import { GEOCODING_URL } from "../config";

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

interface PhotonProperties {
  name?: string;
  street?: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }; // [lng, lat]
  properties: PhotonProperties;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

function buildDisplayName(props: PhotonProperties): string {
  const parts = [props.name, props.street, props.district, props.city, props.state, props.country];
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(part);
  }
  return deduped.join(", ");
}

function buildShortLabel(props: PhotonProperties): string {
  // Compact label for a status row: a named place or street, plus the city/district -- skip
  // state/country, which is just noise at this zoom level.
  const parts = [props.name ?? props.street, props.city ?? props.district];
  return parts.filter((p): p is string => !!p).join(", ");
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({ lon: String(lng), lat: String(lat), lang: "en" });
  const res = await fetch(`${GEOCODING_URL}/reverse?${params.toString()}`, {
    headers: { "User-Agent": "Orbit (self-hosted location-sharing app)" },
  });
  if (!res.ok) return null;
  const data: PhotonResponse = await res.json();
  const feature = data.features[0];
  if (!feature) return null;
  const label = buildShortLabel(feature.properties);
  return label.length > 0 ? label : null;
}

export async function searchPlaces(query: string, near?: [number, number]): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({ q: query, limit: "10", lang: "en" });
  if (near) {
    const [lng, lat] = near;
    params.set("lat", String(lat));
    params.set("lon", String(lng));
    // Soft bias (Photon still returns global matches, just ranks nearby ones higher) rather than a
    // hard filter -- prefer nearby matches without hiding a genuine faraway result if that's really
    // what the user typed.
    params.set("location_bias_scale", "0.5");
  }

  const res = await fetch(`${GEOCODING_URL}/api/?${params.toString()}`, {
    headers: { "User-Agent": "Orbit (self-hosted location-sharing app)" },
  });
  if (!res.ok) throw new Error("Search failed");
  const data: PhotonResponse = await res.json();
  const parsed = data.features
    .map((f) => ({
      displayName: buildDisplayName(f.properties),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }))
    .filter((r) => r.displayName.length > 0);

  if (!near) return parsed;
  // Photon's own ranking already factors in the lat/lon bias, but it's a relevance score, not a
  // strict distance sort -- enforce nearest-first client-side as a safety net. A squared planar
  // distance is enough for ordering purposes at this scale (no need for haversine).
  const [nearLng, nearLat] = near;
  return parsed.sort((a, b) => {
    const da = (a.lng - nearLng) ** 2 + (a.lat - nearLat) ** 2;
    const db = (b.lng - nearLng) ** 2 + (b.lat - nearLat) ** 2;
    return da - db;
  });
}
