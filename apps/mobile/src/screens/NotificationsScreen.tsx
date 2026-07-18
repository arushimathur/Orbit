import React from "react";
import { StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import { useTheme } from "../theme/theme";

export default function NotificationsScreen() {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <Screen>
      <Ionicons name="notifications-outline" size={48} color={colors.mutedForeground} />
      <Text
        style={[
          styles.title,
          { color: colors.foreground, fontSize: fontSize.lg, marginTop: spacing(4) },
        ]}
      >
        No notifications yet
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: spacing(2) },
        ]}
      >
        Place arrival and departure alerts are coming in a future update.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center" },
});
