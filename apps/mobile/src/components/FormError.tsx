import React from "react";
import { Text } from "react-native";
import { useTheme } from "../theme/theme";

export default function FormError({ message }: { message: string }) {
  const { colors, fontSize, spacing } = useTheme();
  return (
    <Text style={{ color: colors.destructive, fontSize: fontSize.sm, marginBottom: spacing(3) }}>{message}</Text>
  );
}
