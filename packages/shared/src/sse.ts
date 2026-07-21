import { z } from "zod";
import { locationPingSchema } from "./location";
import { publicUserSchema } from "./user";

// Server -> client: streamed over GET /circles/:circleId/locations/events (SSE)
// whenever a member of that circle posts a new ping. `ping` is null and
// `sharingPausedUntil` is set while the member has paused sharing for this circle.
export const locationUpdateEventSchema = z.object({
  circleId: z.string().uuid(),
  user: publicUserSchema,
  ping: locationPingSchema.nullable(),
  sharingPausedUntil: z.string().datetime().nullable().optional(),
});
export type LocationUpdateEvent = z.infer<typeof locationUpdateEventSchema>;

export const SSE_EVENTS = {
  LOCATION_UPDATE: "location:update",
} as const;
