import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { MemberLocation, Notification } from "@orbit/shared";
import { MAP_STYLE_URL } from "../config";
import MemberStatusLine from "./MemberStatusLine";
import { useTheme } from "../theme/theme";

// The "Map" half of the Family tab's List <-> Map toggle (frame 1b) -- pulled out of the
// old standalone Map screen so both the toggle and the join/onboarding flows can reuse the
// same pins-and-list rendering without a second navigation stack entry.
export default function FamilyMapView({
  members,
  onSelectMember,
  latestByActor = {},
  displayName,
}: {
  members: MemberLocation[];
  onSelectMember: (userId: string) => void;
  latestByActor?: Record<string, Notification | undefined>;
  displayName?: (userId: string, fallbackName: string) => string;
}) {
  const { colors, radius, fontSize, shadow } = useTheme();
  const withPing = members.filter((m) => m.ping);
  const nameFor = (userId: string, fallback: string) => displayName?.(userId, fallback) ?? fallback;

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView style={styles.map} mapStyle={MAP_STYLE_URL}>
        <MapLibreGL.Camera
          zoomLevel={withPing.length ? 12 : 2}
          centerCoordinate={withPing[0] ? [withPing[0].ping!.lng, withPing[0].ping!.lat] : [0, 0]}
        />
        {withPing.map(({ user, ping }) => (
          <MapLibreGL.PointAnnotation
            key={user.id}
            id={user.id}
            coordinate={[ping!.lng, ping!.lat]}
            onSelected={() => onSelectMember(user.id)}
          >
            <View
              style={[
                styles.pin,
                shadow.sm,
                { backgroundColor: colors.primary, borderRadius: radius.full, borderColor: colors.card },
              ]}
            >
              <Text style={[styles.pinText, { color: colors.primaryForeground }]}>
                {nameFor(user.id, user.name).slice(0, 1).toUpperCase()}
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
          <Pressable
            onPress={() => onSelectMember(item.user.id)}
            style={[styles.row, { paddingHorizontal: 16, paddingVertical: 12 }]}
          >
            <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.base }]}>
              {nameFor(item.user.id, item.user.name)}
            </Text>
            <MemberStatusLine ping={item.ping} latestEvent={latestByActor[item.user.id]} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 3 },
  pin: { width: 32, height: 32, justifyContent: "center", alignItems: "center", borderWidth: 2 },
  pinText: { fontWeight: "700" },
  list: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "600" },
});
