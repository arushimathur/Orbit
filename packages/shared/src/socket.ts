import { z } from "zod";
import { locationPingSchema } from "./location";
import { publicUserSchema } from "./user";

// Client -> server: join the room for a circle after connecting (JWT already sent as auth on connect).
export const joinCircleEventSchema = z.object({
  circleId: z.string().uuid(),
});
export type JoinCircleEvent = z.infer<typeof joinCircleEventSchema>;

// Server -> client: broadcast within `circle:<circleId>` room whenever a member posts a new ping.
export const locationUpdateEventSchema = z.object({
  circleId: z.string().uuid(),
  user: publicUserSchema,
  ping: locationPingSchema,
});
export type LocationUpdateEvent = z.infer<typeof locationUpdateEventSchema>;

export const SOCKET_EVENTS = {
  JOIN_CIRCLE: "circle:join",
  LOCATION_UPDATE: "location:update",
} as const;
