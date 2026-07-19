import { z } from "zod";

export const savedLocationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(20).max(5000),
  createdAt: z.string().datetime(),
});
export type SavedLocation = z.infer<typeof savedLocationSchema>;

export const createPlaceDtoSchema = z.object({
  name: z.string().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(20).max(5000),
});
export type CreatePlaceDto = z.infer<typeof createPlaceDtoSchema>;
