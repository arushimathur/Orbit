import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { useTheme } from "../theme/theme";

type Props = TextInputProps & {
  label?: string;
};

export default function TextField({ label, style, ...inputProps }: Props) {
  const { colors, radius, spacing, fontSize } = useTheme();

  return (
    <View style={{ marginBottom: spacing(3) }}>
      {label && (
        <Text style={[styles.label, { color: colors.mutedForeground, fontSize: fontSize.sm, marginBottom: spacing(1.5) }]}>
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.input,
            color: colors.foreground,
            borderRadius: radius.md,
            paddingVertical: spacing(3),
            paddingHorizontal: spacing(4),
            fontSize: fontSize.base,
          },
          style,
        ]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: "500" },
  input: { borderWidth: 1 },
});
