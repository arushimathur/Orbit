// Set these in an `.env` file consumed by `expo start` (Expo inlines EXPO_PUBLIC_* vars at build time)
// or export them in your shell before running `npm run mobile:start`.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// OpenFreeMap (openfreemap.org) hosts free public vector tiles with no account,
// API key, or usage limits -- no Mapbox/Google signup needed. Override via env
// if you'd rather point at your own self-hosted tile server later.
export const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

// Photon (komoot's free OpenStreetMap-based geocoder) -- no account or API key needed, matching
// the no-Mapbox/Google-signup approach used for map tiles. Unlike Nominatim, it's built for
// typo-tolerant, keyword/search-as-you-type queries ("Waves Moradabad" finding a mall named
// "Waves Mall" a few streets over), which is what place search actually needs here. The public
// instance's usage policy (https://photon.komoot.io) expects "reasonable" request volume --
// fine for a small trusted circle; override via env if you self-host your own instance.
export const GEOCODING_URL = process.env.EXPO_PUBLIC_GEOCODING_URL ?? "https://photon.komoot.io";
