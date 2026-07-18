import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import { useTheme } from "../theme/theme";

export default function ProfileScreen() {
  const { user } = useAuth();
  const { circle } = useCircle();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();

  if (!user) return null;

  const cardStyle = [
    styles.card,
    shadow.sm,
    {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing(5),
      marginBottom: spacing(5),
    },
  ];

  return (
    <Screen>
      <View style={[styles.avatar, { backgroundColor: colors.primary, borderRadius: radius.full, marginBottom: spacing(5) }]}>
        <Text style={[styles.avatarText, { color: colors.primaryForeground, fontSize: fontSize["3xl"] }]}>
          {user.name.slice(0, 1).toUpperCase()}
        </Text>
      </View>

      <View style={cardStyle}>
        <View style={[styles.row, { marginBottom: spacing(4) }]}>
          <Ionicons name="person-outline" size={fontSize.lg} color={colors.mutedForeground} />
          <View style={{ marginLeft: spacing(3) }}>
            <Text style={[styles.label, { color: colors.mutedForeground, fontSize: fontSize.xs }]}>Name</Text>
            <Text style={[styles.value, { color: colors.foreground, fontSize: fontSize.base }]}>{user.name}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons name="mail-outline" size={fontSize.lg} color={colors.mutedForeground} />
          <View style={{ marginLeft: spacing(3) }}>
            <Text style={[styles.label, { color: colors.mutedForeground, fontSize: fontSize.xs }]}>Email</Text>
            <Text style={[styles.value, { color: colors.foreground, fontSize: fontSize.base }]}>{user.email}</Text>
          </View>
        </View>
      </View>

      {circle && (
        <View style={cardStyle}>
          <View style={styles.row}>
            <Ionicons name="people-outline" size={fontSize.lg} color={colors.mutedForeground} />
            <View style={{ marginLeft: spacing(3) }}>
              <Text style={[styles.label, { color: colors.mutedForeground, fontSize: fontSize.xs }]}>Circle</Text>
              <Text style={[styles.value, { color: colors.foreground, fontSize: fontSize.base }]}>{circle.name}</Text>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center" },
  label: { fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { marginTop: 2 },
  avatar: { width: 72, height: 72, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  avatarText: { fontWeight: "700" },
});
