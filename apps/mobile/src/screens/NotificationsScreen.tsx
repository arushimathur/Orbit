import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Notification } from "@orbit/shared";
import * as api from "../api/endpoints";
import { useNicknames } from "../hooks/useNicknames";
import BottomTabBar from "../components/BottomTabBar";
import { useTheme } from "../theme/theme";
import { lastSeenLabel } from "../utils/time";

const EVENT_ICON: Record<Notification["type"], keyof typeof Ionicons.glyphMap> = {
  arrived: "enter-outline",
  left: "exit-outline",
  low_battery: "battery-dead-outline",
};

function eventText(n: Notification, actorName: string): string {
  if (n.type === "arrived") return `${actorName} arrived at ${n.placeName}`;
  if (n.type === "left") return `${actorName} left ${n.placeName}`;
  return `${actorName}'s battery is low`;
}

export default function NotificationsScreen() {
  const { colors, spacing, fontSize, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const { displayName } = useNicknames();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsLoading(true);
      api
        .listNotifications()
        .then((result) => {
          if (isMounted) setNotifications(result);
          // Only mark as read once the list actually loaded -- if the fetch failed, the user
          // never saw these, so leave them unread for the next focus retry.
          api.markAllNotificationsRead().catch(() => undefined);
        })
        .catch(() => {
          // Nothing actionable to show the user for a failed fetch here -- just leave the
          // list as-is/empty and let the next focus retry.
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }, []),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          shadow.sm,
          { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + spacing(3) },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground, fontSize: fontSize.lg }]}>Activity</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize.lg, marginTop: spacing(4) }]}>
            No notifications yet
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: spacing(2), paddingHorizontal: spacing(8) },
            ]}
          >
            You'll be notified when someone in your circle arrives at or leaves a saved place, or their battery runs low.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingHorizontal: spacing(4), paddingBottom: spacing(4) }}
          renderItem={({ item }) => (
            <View style={[styles.row, { paddingVertical: spacing(3), borderBottomColor: colors.border }]}>
              <Ionicons
                name={EVENT_ICON[item.type]}
                size={fontSize.xl}
                color={item.type === "low_battery" ? colors.destructive : colors.primary}
                style={{ marginRight: spacing(3) }}
              />
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.text, { color: colors.foreground, fontSize: fontSize.base }]}>
                  {eventText(item, item.actorUserId ? displayName(item.actorUserId, item.actorName) : item.actorName)}
                </Text>
                <Text style={[styles.time, { color: colors.mutedForeground, fontSize: fontSize.sm }]}>
                  {lastSeenLabel(item.occurredAt)}
                </Text>
              </View>
              {!item.readAt && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </View>
          )}
        />
      )}

      <BottomTabBar active="alerts" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontWeight: "700" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  text: { fontWeight: "500" },
  time: { marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
});
