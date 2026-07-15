import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/theme";

type Variant = "primary" | "secondary" | "outline" | "ghost";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
};

export default function Button({ title, onPress, variant = "primary", disabled, loading }: Props) {
  const { colors, radius, spacing, fontSize, shadow } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyle = {
    primary: { backgroundColor: colors.primary, borderColor: colors.primary },
    secondary: { backgroundColor: colors.secondary, borderColor: colors.secondary },
    outline: { backgroundColor: "transparent", borderColor: colors.border },
    ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  }[variant];

  const textColor = {
    primary: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    outline: colors.foreground,
    ghost: colors.primary,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        variant === "primary" && shadow.sm,
        {
          borderRadius: radius.md,
          paddingVertical: spacing(3.5),
          paddingHorizontal: spacing(5),
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize: fontSize.base }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
  },
});
