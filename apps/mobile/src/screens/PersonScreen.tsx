import React, { useCallback, useRef, useState } from "react";
import { Animated, Dimensions, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { Notification } from "@orbit/shared";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import { useCircleLocations } from "../hooks/useCircleLocations";
import { useNicknames } from "../hooks/useNicknames";
import * as api from "../api/endpoints";
import { MAP_STYLE_URL } from "../config";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";
import { lastSeenLabel } from "../utils/time";
import { groupByDay } from "../utils/memberStatus";

type Props = NativeStackScreenProps<MainStackParamList, "Person">;

const SHEET_COLLAPSED = 116;
const SHEET_EXPANDED = Dimensions.get("window").height * 0.6;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function PersonScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { user } = useAuth();
  const { circle } = useCircle();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const memberLocations = useCircleLocations(circle?.id);
  const { displayName } = useNicknames();
  const member = memberLocations[userId];
  const isSelf = userId === user?.id;
  const [events, setEvents] = useState<Notification[]>([]);
  const [expanded, setExpanded] = useState(false);
  const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED)).current;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      api
        .listNotifications()
        .then((result) => {
          if (isMounted) setEvents(result.filter((n) => n.actorUserId === userId));
        })
        .catch(() => undefined);
      return () => {
        isMounted = false;
      };
    }, [userId]),
  );

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(sheetHeight, {
      toValue: next ? SHEET_EXPANDED : SHEET_COLLAPSED,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  if (!circle) return null;

  const hasPing = !!member?.ping;
  const subtitle = member?.ping
    ? `${lastSeenLabel(member.ping.recordedAt)}${
        member.ping.batteryPct !== null ? ` · ${Math.round(member.ping.batteryPct)}% battery` : ""
      }`
    : "No location yet";
  const sections = groupByDay(events);
  const latest = events[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapLibreGL.MapView style={styles.map} mapStyle={MAP_STYLE_URL}>
        <MapLibreGL.Camera
          zoomLevel={hasPing ? 14 : 2}
          centerCoordinate={hasPing ? [member!.ping!.lng, member!.ping!.lat] : [0, 0]}
        />
        {hasPing && (
          <MapLibreGL.PointAnnotation id={userId} coordinate={[member!.ping!.lng, member!.ping!.lat]}>
            <View
              style={[
                styles.pin,
                shadow.sm,
                { backgroundColor: colors.primary, borderRadius: radius.full, borderColor: colors.card },
              ]}
            >
              <Text style={[styles.pinText, { color: colors.primaryForeground }]}>
                {(member?.user.name ?? "?").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          </MapLibreGL.PointAnnotation>
        )}
      </MapLibreGL.MapView>

      <View
        style={[
          styles.header,
          shadow.sm,
          { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + spacing(3) },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable accessibilityLabel="Back" onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons
              name="chevron-back"
              size={fontSize.xl}
              color={colors.foreground}
              style={{ marginRight: spacing(3) }}
            />
          </Pressable>
          <View style={{ flexShrink: 1, flex: 1 }}>
            <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.lg }]}>
              {displayName(userId, member?.user.name ?? "Member")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontSize: fontSize.sm }]}>
              {subtitle}
            </Text>
          </View>
          {!isSelf && member && (
            <Pressable
              accessibilityLabel="Rename for yourself"
              onPress={() => navigation.navigate("RenameMember", { userId, currentName: member.user.name })}
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={fontSize.lg} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <Animated.View
        style={[
          styles.sheet,
          shadow.md,
          {
            height: sheetHeight,
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <Pressable onPress={toggleExpanded} style={{ paddingHorizontal: spacing(4), paddingTop: spacing(3) }}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeaderRow}>
            <Text style={[styles.sheetTitle, { color: colors.foreground, fontSize: fontSize.base }]}>Activity</Text>
            <Ionicons
              name={expanded ? "chevron-down" : "chevron-up"}
              size={fontSize.lg}
              color={colors.mutedForeground}
            />
          </View>
          {!expanded && (
            <Text
              style={[styles.preview, { color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: spacing(1) }]}
              numberOfLines={1}
            >
              {latest
                ? `${latest.type === "arrived" ? "Reached" : "Left"} ${latest.placeName} · ${formatTime(latest.occurredAt)}`
                : "No activity yet"}
            </Text>
          )}
        </Pressable>

        {expanded && (
          <SectionList
            style={{ marginTop: spacing(2) }}
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing(4), paddingBottom: spacing(4) }}
            renderSectionHeader={({ section }) => (
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.mutedForeground, fontSize: fontSize.xs, marginTop: spacing(3) },
                ]}
              >
                {section.title}
              </Text>
            )}
            renderItem={({ item }) => (
              <View style={[styles.eventRow, { paddingVertical: spacing(2) }]}>
                <Ionicons
                  name={item.type === "arrived" ? "enter-outline" : "exit-outline"}
                  size={fontSize.lg}
                  color={colors.primary}
                  style={{ marginRight: spacing(3) }}
                />
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.eventText, { color: colors.foreground, fontSize: fontSize.base }]}>
                    {item.type === "arrived" ? "Reached" : "Left"} {item.placeName}
                  </Text>
                  <Text style={[styles.eventTime, { color: colors.mutedForeground, fontSize: fontSize.sm }]}>
                    {formatTime(item.occurredAt)}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.mutedForeground, fontSize: fontSize.sm }]}>
                No activity recorded yet.
              </Text>
            }
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: "row", alignItems: "center" },
  name: { fontWeight: "700" },
  subtitle: { marginTop: 2 },
  pin: { width: 32, height: 32, justifyContent: "center", alignItems: "center", borderWidth: 2 },
  pinText: { fontWeight: "700" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, overflow: "hidden" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontWeight: "700" },
  preview: {},
  sectionTitle: { fontWeight: "700", letterSpacing: 0.5 },
  eventRow: { flexDirection: "row", alignItems: "center" },
  eventText: { fontWeight: "600" },
  eventTime: { marginTop: 2 },
  empty: { textAlign: "center", marginTop: 24 },
});
