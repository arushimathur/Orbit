import EventSource, { EventSourceEvent } from "react-native-sse";
import { LocationUpdateEvent, SSE_EVENTS } from "@orbit/shared";
import { API_URL } from "../config";
import { tokenStore } from "./tokenStore";

type CircleEventType = typeof SSE_EVENTS.LOCATION_UPDATE;

export async function subscribeToCircleEvents(
  circleId: string,
  onLocationUpdate: (event: LocationUpdateEvent) => void,
): Promise<() => void> {
  const accessToken = await tokenStore.getAccessToken();
  const source = new EventSource<CircleEventType>(`${API_URL}/circles/${circleId}/locations/events`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  const listener = (event: EventSourceEvent<CircleEventType, CircleEventType>) => {
    if (!event.data) return;
    onLocationUpdate(JSON.parse(event.data) as LocationUpdateEvent);
  };
  source.addEventListener(SSE_EVENTS.LOCATION_UPDATE, listener);

  return () => {
    source.removeEventListener(SSE_EVENTS.LOCATION_UPDATE, listener);
    source.close();
  };
}
