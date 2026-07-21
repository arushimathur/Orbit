import { LocationPrecision } from "@orbit/shared";

// "city" precision coarsens to ~1.1km (2 decimal places) rather than reverse-geocoding to
// an actual city name -- cheap, no extra geocoding calls, good enough for "area, not exact".
const CITY_PRECISION_DECIMALS = 2;

export function coarsenCoordinate(value: number, precision: LocationPrecision): number {
  if (precision !== "city") return value;
  const factor = 10 ** CITY_PRECISION_DECIMALS;
  return Math.round(value * factor) / factor;
}
