import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Notification } from "@orbit/shared";
import * as api from "../api/endpoints";
import Screen from "../components/Screen";
import { useTheme } from "../theme/theme";
import { lastSeenLabel } from "../utils/time";

export default function NotificationsScreen() {
  const { colors, spacing, fontSize } = useTheme();
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

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (notifications.length === 0) {
    return (
      <Screen>
        <Ionicons name="notifications-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize.lg, marginTop: spacing(4) }]}>
          No notifications yet
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: spacing(2) }]}
        >
          You'll be notified when someone in your circle arrives at or leaves a saved place.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} center={false}>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingBottom: spacing(4) }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              { paddingVertical: spacing(3), borderBottomColor: colors.border },
            ]}
          >
            <Ionicons
              name={item.type === "arrived" ? "enter-outline" : "exit-outline"}
              size={fontSize.xl}
              color={colors.primary}
              style={{ marginRight: spacing(3) }}
            />
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.text, { color: colors.foreground, fontSize: fontSize.base }]}>
                {item.actorName} {item.type === "arrived" ? "arrived at" : "left"} {item.placeName}
              </Text>
              <Text style={[styles.time, { color: colors.mutedForeground, fontSize: fontSize.sm }]}>
                {lastSeenLabel(item.occurredAt)}
              </Text>
            </View>
            {!item.readAt && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  text: { fontWeight: "500" },
  time: { marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
});
