import { z } from "zod";
import { locationPingSchema } from "./location";
import { publicUserSchema } from "./user";

// Server -> client: streamed over GET /circles/:circleId/locations/events (SSE)
// whenever a member of that circle posts a new ping.
export const locationUpdateEventSchema = z.object({
  circleId: z.string().uuid(),
  user: publicUserSchema,
  ping: locationPingSchema,
});
export type LocationUpdateEvent = z.infer<typeof locationUpdateEventSchema>;

export const SSE_EVENTS = {
  LOCATION_UPDATE: "location:update",
} as const;
