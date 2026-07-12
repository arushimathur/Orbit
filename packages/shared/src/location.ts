import { z } from "zod";
import { publicUserSchema } from "./user";

export const locationPingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative().nullable(),
  speedMps: z.number().nonnegative().nullable(),
  heading: z.number().min(0).max(360).nullable(),
  batteryPct: z.number().min(0).max(100).nullable(),
  recordedAt: z.string().datetime(),
});
export type LocationPing = z.infer<typeof locationPingSchema>;

// What the member list / live map render: the latest ping joined with the user it belongs to.
export const memberLocationSchema = z.object({
  user: publicUserSchema,
  ping: locationPingSchema.nullable(),
});
export type MemberLocation = z.infer<typeof memberLocationSchema>;

export const createLocationPingDtoSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative().nullable().optional(),
  speedMps: z.number().nonnegative().nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  batteryPct: z.number().min(0).max(100).nullable().optional(),
  recordedAt: z.string().datetime().optional(),
});
export type CreateLocationPingDto = z.infer<typeof createLocationPingDtoSchema>;
