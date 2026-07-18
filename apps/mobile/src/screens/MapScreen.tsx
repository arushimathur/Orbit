import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { LocationUpdateEvent, MemberLocation } from "@orbit/shared";
import { useCircle } from "../circle/CircleContext";
import * as api from "../api/endpoints";
import { subscribeToCircleEvents } from "../api/sse";
import { startBackgroundLocationTracking } from "../location/backgroundLocationTask";
import { MAP_STYLE_URL } from "../config";
import { MainStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";

function lastSeenLabel(recordedAt: string): string {
  const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(recordedAt).getTime()) / 60000));
  if (minutesAgo < 1) return "just now";
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  return `${Math.round(minutesAgo / 60)}h ago`;
}

export default function MapScreen() {
  const { circle } = useCircle();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          shadow.sm,
          { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + spacing(3) },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.headerText, styles.headerRowInner]}
            onPress={() => navigation.navigate("Circles")}
            hitSlop={8}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.circleName, { color: colors.foreground, fontSize: fontSize.lg }]}>
                {circle.name}
              </Text>
              <Text style={[styles.inviteCode, { color: colors.mutedForeground, fontSize: fontSize.sm }]}>
                Invite code: {circle.inviteCode}
              </Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={fontSize.base}
              color={colors.mutedForeground}
              style={{ marginLeft: spacing(1) }}
            />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Notifications"
              onPress={() => navigation.navigate("Notifications")}
              style={{ marginLeft: spacing(4) }}
              hitSlop={8}
            >
              <Ionicons name="notifications-outline" size={fontSize.xl} color={colors.foreground} />
            </Pressable>
            <Pressable
              accessibilityLabel="Profile"
              onPress={() => navigation.navigate("Profile")}
              style={{ marginLeft: spacing(4) }}
              hitSlop={8}
            >
              <Ionicons name="person-circle-outline" size={fontSize.xl} color={colors.foreground} />
            </Pressable>
            <Pressable
              accessibilityLabel="Settings"
              onPress={() => navigation.navigate("Settings")}
              style={{ marginLeft: spacing(4) }}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={fontSize.xl} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
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
            <View
              style={[
                styles.pin,
                shadow.sm,
                { backgroundColor: colors.primary, borderRadius: radius.full, borderColor: colors.card },
              ]}
            >
              <Text style={[styles.pinText, { color: colors.primaryForeground }]}>
                {user.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          </MapLibreGL.PointAnnotation>
        ))}
      </MapLibreGL.MapView>

      <FlatList
        style={[styles.list, { backgroundColor: colors.card, borderTopColor: colors.border }]}
        data={members}
        keyExtractor={(m) => m.user.id}
        renderItem={({ item }) => (
          <View style={[styles.row, { paddingHorizontal: spacing(4), paddingVertical: spacing(3) }]}>
            <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.base }]}>
              {item.user.name}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground, fontSize: fontSize.sm }]}>
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
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerText: { flexShrink: 1 },
  headerRowInner: { flexDirection: "row", alignItems: "center" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  circleName: { fontWeight: "700" },
  inviteCode: { marginTop: 2 },
  map: { flex: 3 },
  pin: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  pinText: { fontWeight: "700" },
  list: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontWeight: "600" },
  meta: {},
});
