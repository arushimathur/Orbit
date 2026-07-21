import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import * as api from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";

type NoParamRoute = "SharingPrivacy" | "NotificationPreferences" | "Places" | "Circles" | "Help";

const ROWS: { icon: keyof typeof Ionicons.glyphMap; label: string; screen: NoParamRoute }[] = [
  { icon: "lock-closed-outline", label: "Sharing & privacy", screen: "SharingPrivacy" },
  { icon: "notifications-outline", label: "Notifications", screen: "NotificationPreferences" },
  { icon: "flag-outline", label: "Places", screen: "Places" },
  { icon: "people-outline", label: "My circles", screen: "Circles" },
  { icon: "help-circle-outline", label: "Help & support", screen: "Help" },
];

export default function YouScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [sharingPausedUntil, setSharingPausedUntil] = useState<string | null>(null);
  const [isLoadingSharing, setIsLoadingSharing] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      api
        .getSharingStatus()
        .then((status) => {
          if (isMounted) setSharingPausedUntil(status.sharingPausedUntil);
        })
        .catch(() => undefined)
        .finally(() => {
          if (isMounted) setIsLoadingSharing(false);
        });
      return () => {
        isMounted = false;
      };
    }, []),
  );

  const isPaused = !!sharingPausedUntil && new Date(sharingPausedUntil) > new Date();

  const onQuickResume = async () => {
    setIsBusy(true);
    try {
      const status = await api.resumeSharing();
      setSharingPausedUntil(status.sharingPausedUntil);
    } finally {
      setIsBusy(false);
    }
  };

  const onLogout = () => {
    Alert.alert("Log out?", "You'll need to sign in again to see your circle.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const cardStyle = [
    styles.card,
    shadow.sm,
    { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing(4) },
  ];

  return (
    <Screen scroll={false} center={false}>
      <View style={cardStyle}>
        <Pressable
          style={[styles.row, { padding: spacing(5) }]}
          onPress={() => navigation.navigate("Profile", { editing: true })}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary, borderRadius: radius.full }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground, fontSize: fontSize.xl }]}>
              {(user?.name ?? "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing(3) }}>
            <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.base }]}>{user?.name}</Text>
            <Text style={[styles.email, { color: colors.mutedForeground, fontSize: fontSize.sm }]}>{user?.email}</Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" }}>Edit</Text>
        </Pressable>
      </View>

      <Pressable style={cardStyle} onPress={() => navigation.navigate("SharingPrivacy")}>
        <View style={[styles.row, { padding: spacing(5) }]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isPaused ? colors.mutedForeground : "#2e9e5b", borderRadius: radius.full },
            ]}
          />
          <Text style={[styles.sharingText, { color: colors.foreground, fontSize: fontSize.base, flex: 1 }]}>
            {isLoadingSharing ? "Sharing location…" : isPaused ? "Sharing location · paused" : "Sharing location · on"}
          </Text>
          {isLoadingSharing ? (
            <ActivityIndicator color={colors.primary} />
          ) : isPaused ? (
            <Pressable onPress={onQuickResume} disabled={isBusy} hitSlop={8}>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" }}>Resume</Text>
            </Pressable>
          ) : (
            <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" }}>Pause</Text>
          )}
        </View>
      </Pressable>

      <View style={cardStyle}>
        {ROWS.map((row, index) => (
          <Pressable
            key={row.screen}
            onPress={() => navigation.navigate(row.screen)}
            style={[
              styles.row,
              { padding: spacing(5), borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border },
            ]}
          >
            <Ionicons name={row.icon} size={fontSize.lg} color={colors.mutedForeground} style={{ marginRight: spacing(3) }} />
            <Text style={{ color: colors.foreground, fontSize: fontSize.base, flex: 1 }}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={fontSize.base} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>

      <View style={cardStyle}>
        <Pressable style={[styles.row, { padding: spacing(5) }]} onPress={onLogout}>
          <Text style={{ color: colors.destructive, fontSize: fontSize.base, fontWeight: "600" }}>Log out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "700" },
  name: { fontWeight: "700" },
  email: { marginTop: 2 },
  statusDot: { width: 10, height: 10, marginRight: 10 },
  sharingText: { fontWeight: "600" },
});
