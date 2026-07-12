export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// OpenFreeMap (openfreemap.org) hosts free public vector tiles with no account,
// API key, or usage limits -- no Mapbox/Google signup needed. Override via env
// if you'd rather point at your own self-hosted tile server later.
export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";
