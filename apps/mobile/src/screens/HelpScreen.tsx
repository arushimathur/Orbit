import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import { useTheme } from "../theme/theme";

const FAQS = [
  {
    q: "Who can see my location?",
    a: "Only the people in a circle you've joined. Each circle has its own members, places, and sharing precision.",
  },
  {
    q: "Can I stop sharing without leaving?",
    a: "Yes — pause anytime from Sharing & privacy. Family sees that you've paused, never a blank map.",
  },
  {
    q: "How do I add a place?",
    a: "Open Places from this screen. Orbit will suggest spots you visit often, or you can add one manually.",
  },
];

export default function HelpScreen() {
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  return (
    <Screen scroll center={false}>
      {FAQS.map((item) => (
        <View
          key={item.q}
          style={[styles.card, shadow.sm, { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing(5), marginBottom: spacing(4) }]}
        >
          <View style={styles.row}>
            <Ionicons name="help-circle-outline" size={fontSize.lg} color={colors.primary} style={{ marginRight: spacing(2) }} />
            <Text style={[styles.question, { color: colors.foreground, fontSize: fontSize.base }]}>{item.q}</Text>
          </View>
          <Text style={[styles.answer, { color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: spacing(2) }]}>
            {item.a}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center" },
  question: { fontWeight: "700", flexShrink: 1 },
  answer: {},
});
