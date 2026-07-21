import { z } from "zod";

// "home"/"work" are per-person special places: every member can have their own, and the
// circle sees them resolved as e.g. "Papa at Home" pointing to Papa's own saved address.
export const placeKindSchema = z.enum(["home", "work", "custom"]);
export type PlaceKind = z.infer<typeof placeKindSchema>;

export const savedLocationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(80),
  kind: placeKindSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(20).max(5000),
  createdAt: z.string().datetime(),
});
export type SavedLocation = z.infer<typeof savedLocationSchema>;

export const createPlaceDtoSchema = z.object({
  name: z.string().min(1).max(80),
  kind: placeKindSchema.default("custom"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(20).max(5000),
});
export type CreatePlaceDto = z.infer<typeof createPlaceDtoSchema>;

// GET /circles/:circleId/places -- every member's saved places, so the circle can see
// "Home" resolve to each person's own address rather than just the caller's own list.
export const circlePlaceSchema = savedLocationSchema.extend({
  ownerName: z.string(),
});
export type CirclePlace = z.infer<typeof circlePlaceSchema>;

// GET /places/suggestions -- an on-demand heuristic result (frequently-visited spot not
// yet saved), not a persisted row. `sampleAddress` is filled in client-side via reverse
// geocoding, same as the rest of the app.
export const placeSuggestionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number(),
  visitedDays: z.number().int().positive(),
});
export type PlaceSuggestion = z.infer<typeof placeSuggestionSchema>;
