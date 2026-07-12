import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { LocationUpdateEvent, MemberLocation } from "@orbit/shared";
import { useCircle } from "../circle/CircleContext";
import * as api from "../api/endpoints";
import { subscribeToCircleEvents } from "../api/sse";
import { startBackgroundLocationTracking } from "../location/backgroundLocationTask";
import { MAP_STYLE_URL } from "../config";

function lastSeenLabel(recordedAt: string): string {
  const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(recordedAt).getTime()) / 60000));
  if (minutesAgo < 1) return "just now";
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  return `${Math.round(minutesAgo / 60)}h ago`;
}

export default function MapScreen() {
  const { circle } = useCircle();
  const [memberLocations, setMemberLocations] = useState<Record<string, MemberLocation>>({});

  useEffect(() => {
    if (!circle) return;
    let isMounted = true;

    (async () => {
      const initial = await api.getLatestLocations(circle.id);
      if (!isMounted) return;
      setMemberLocations(Object.fromEntries(initial.map((m) => [m.user.id, m])));
    })();

    startBackgroundLocationTracking()
      .then((result) => {
        if (!result.started) {
          Alert.alert("Location tracking did not start", result.reason);
        }
      })
      .catch((err) => {
        Alert.alert("Location tracking error", err instanceof Error ? err.message : String(err));
      });

    let cleanupSse: (() => void) | undefined;
    (async () => {
      const onLocationUpdate = (event: LocationUpdateEvent) => {
        setMemberLocations((prev) => ({ ...prev, [event.user.id]: { user: event.user, ping: event.ping } }));
      };
      cleanupSse = await subscribeToCircleEvents(circle.id, onLocationUpdate);
    })();

    return () => {
      isMounted = false;
      cleanupSse?.();
    };
  }, [circle?.id]);

  const members = Object.values(memberLocations);
  const withPing = members.filter((m) => m.ping);

  if (!circle) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.circleName}>{circle.name}</Text>
        <Text style={styles.inviteCode}>Invite code: {circle.inviteCode}</Text>
      </View>
      <MapLibreGL.MapView style={styles.map} mapStyle={MAP_STYLE_URL}>
        <MapLibreGL.Camera
          zoomLevel={withPing.length ? 12 : 2}
          centerCoordinate={
            withPing[0] ? [withPing[0].ping!.lng, withPing[0].ping!.lat] : [0, 0]
          }
        />
        {withPing.map(({ user, ping }) => (
          <MapLibreGL.PointAnnotation key={user.id} id={user.id} coordinate={[ping!.lng, ping!.lat]}>
            <View style={styles.pin}>
              <Text style={styles.pinText}>{user.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          </MapLibreGL.PointAnnotation>
        ))}
      </MapLibreGL.MapView>

      <FlatList
        style={styles.list}
        data={members}
        keyExtractor={(m) => m.user.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.user.name}</Text>
            <Text style={styles.meta}>
              {item.ping
                ? `${lastSeenLabel(item.ping.recordedAt)}${
                    item.ping.batteryPct !== null ? ` · ${Math.round(item.ping.batteryPct)}% battery` : ""
                  }`
                : "No location yet"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ccc" },
  circleName: { fontSize: 18, fontWeight: "700" },
  inviteCode: { color: "#666", fontSize: 13, marginTop: 2 },
  map: { flex: 3 },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  pinText: { color: "white", fontWeight: "700" },
  list: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#ccc" },
  row: { flexDirection: "row", justifyContent: "space-between", padding: 12 },
  name: { fontWeight: "600" },
  meta: { color: "#666" },
});
