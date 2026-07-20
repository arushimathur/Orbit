import React from "react";
import { DevSettings, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/theme";

// Dev-only convenience: reload the JS bundle without reaching for the shake gesture / dev menu.
// Rendered only when `__DEV__` is true (see App.tsx), so it never ships in a release build.
export default function DevReloadButton() {
  const { colors, spacing, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityLabel="Reload app"
      onPress={() => DevSettings.reload()}
      style={[
        styles.button,
        shadow.md,
        {
          top: insets.top + spacing(2),
          right: spacing(3),
          backgroundColor: colors.primary,
          borderRadius: radius.full,
        },
      ]}
      hitSlop={8}
    >
      <Ionicons name="refresh" size={20} color={colors.primaryForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 999,
  },
});
