import { z } from "zod";

export const placeEventTypeSchema = z.enum(["arrived", "left", "low_battery"]);
export type PlaceEventType = z.infer<typeof placeEventTypeSchema>;

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: placeEventTypeSchema,
  // Empty for "low_battery" events, which aren't tied to a saved place.
  placeName: z.string(),
  actorUserId: z.string().uuid().nullable(),
  actorName: z.string(),
  occurredAt: z.string().datetime(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof notificationSchema>;
