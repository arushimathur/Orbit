import React, { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme";

type Props = PropsWithChildren<{
  scroll?: boolean;
  center?: boolean;
  style?: ViewStyle;
}>;

export default function Screen({ children, scroll = true, center = true, style }: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={[
        styles.content,
        center && styles.centered,
        { padding: spacing(6), paddingTop: insets.top + spacing(6), paddingBottom: insets.bottom + spacing(6) },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {scroll ? (
        <ScrollView contentContainerStyle={styles.flexGrow} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  content: { flex: 1, width: "100%" },
  centered: { justifyContent: "center" },
});
