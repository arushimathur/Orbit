import { useEffect, useState } from "react";
import { LocationUpdateEvent, MemberLocation } from "@orbit/shared";
import * as api from "../api/endpoints";
import { subscribeToCircleEvents } from "../api/sse";

export function useCircleLocations(circleId: string | undefined): Record<string, MemberLocation> {
  const [memberLocations, setMemberLocations] = useState<Record<string, MemberLocation>>({});

  useEffect(() => {
    if (!circleId) return;
    let isMounted = true;
    setMemberLocations({});

    (async () => {
      const initial = await api.getLatestLocations(circleId);
      if (!isMounted) return;
      setMemberLocations(Object.fromEntries(initial.map((m) => [m.user.id, m])));
    })();

    let cleanupSse: (() => void) | undefined;
    (async () => {
      const onLocationUpdate = (event: LocationUpdateEvent) => {
        setMemberLocations((prev) => ({ ...prev, [event.user.id]: { user: event.user, ping: event.ping } }));
      };
      cleanupSse = await subscribeToCircleEvents(circleId, onLocationUpdate);
    })();

    return () => {
      isMounted = false;
      cleanupSse?.();
    };
  }, [circleId]);

  return memberLocations;
}
