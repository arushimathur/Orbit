import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MemberLocation, Notification } from "@orbit/shared";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import { useCircleLocations } from "../hooks/useCircleLocations";
import * as api from "../api/endpoints";
import { MainStackParamList } from "../navigation/RootNavigator";
import BottomTabBar from "../components/BottomTabBar";
import MemberStatusLine from "../components/MemberStatusLine";
import { useTheme } from "../theme/theme";
import { latestEventsByActor } from "../utils/memberStatus";

function MemberRow({
  member,
  isSelf,
  latestEvent,
  onPress,
}: {
  member: MemberLocation;
  isSelf: boolean;
  latestEvent: Notification | undefined;
  onPress: () => void;
}) {
  const { colors, spacing, radius, fontSize, shadow } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        shadow.sm,
        { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing(4), marginBottom: spacing(3) },
      ]}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: isSelf ? colors.primary : colors.muted, borderRadius: radius.full, marginRight: spacing(3) },
        ]}
      >
        <Text style={[styles.avatarText, { color: isSelf ? colors.primaryForeground : colors.mutedForeground }]}>
          {member.user.name.slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.base }]}>
          {member.user.name}
          {isSelf && <Text style={[styles.you, { color: colors.mutedForeground, fontSize: fontSize.sm }]}> you</Text>}
        </Text>
        <View style={styles.statusRow}>
          <MemberStatusLine ping={member.ping} latestEvent={latestEvent} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={fontSize.lg} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const { circle } = useCircle();
  const { user } = useAuth();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const memberLocations = useCircleLocations(circle?.id);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      api
        .listNotifications()
        .then((result) => {
          if (isMounted) setNotifications(result);
        })
        .catch(() => undefined);
      return () => {
        isMounted = false;
      };
    }, []),
  );

  useEffect(() => {
    if (Object.keys(memberLocations).length > 0) setIsLoading(false);
  }, [memberLocations]);

  if (!circle) return null;

  const members = Object.values(memberLocations).sort((a, b) => a.user.name.localeCompare(b.user.name));
  const latestByActor = latestEventsByActor(notifications);
  const homeCount = members.filter((m) => latestByActor[m.user.id]?.type === "arrived").length;
  const awayCount = members.length - homeCount;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          shadow.sm,
          { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + spacing(3) },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.headerText, styles.headerRowInner]}
            onPress={() => navigation.navigate("Circles")}
            hitSlop={8}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.circleName, { color: colors.foreground, fontSize: fontSize.lg }]}>
                {circle.name}
              </Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={fontSize.base}
              color={colors.mutedForeground}
              style={{ marginLeft: spacing(1) }}
            />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Profile"
              onPress={() => navigation.navigate("Profile")}
              style={{ marginLeft: spacing(4) }}
              hitSlop={8}
            >
              <Ionicons name="person-circle-outline" size={fontSize.xl} color={colors.foreground} />
            </Pressable>
            <Pressable
              accessibilityLabel="Settings"
              onPress={() => navigation.navigate("Settings")}
              style={{ marginLeft: spacing(4) }}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={fontSize.xl} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={members}
          keyExtractor={(m) => m.user.id}
          contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(4) }}
          ListHeaderComponent={
            <Pressable
              onPress={() => navigation.navigate("Map")}
              style={[
                styles.banner,
                { backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing(4), marginBottom: spacing(4) },
              ]}
            >
              <Ionicons
                name="people"
                size={fontSize["2xl"]}
                color={colors.accentForeground}
                style={{ marginRight: spacing(3) }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: colors.accentForeground, fontSize: fontSize.base }]}>
                  Everyone's safe
                </Text>
                <Text style={[styles.bannerSubtitle, { color: colors.accentForeground, fontSize: fontSize.sm }]}>
                  {homeCount} home · {awayCount} away
                </Text>
              </View>
              <Ionicons name="map-outline" size={fontSize.xl} color={colors.accentForeground} />
            </Pressable>
          }
          renderItem={({ item }) => (
            <MemberRow
              member={item}
              isSelf={item.user.id === user?.id}
              latestEvent={latestByActor[item.user.id]}
              onPress={() => navigation.navigate("Person", { userId: item.user.id })}
            />
          )}
        />
      )}

      <BottomTabBar active="family" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerText: { flexShrink: 1 },
  headerRowInner: { flexDirection: "row", alignItems: "center" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  circleName: { fontWeight: "700" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { flex: 1 },
  banner: { flexDirection: "row", alignItems: "center" },
  bannerTitle: { fontWeight: "700" },
  bannerSubtitle: { marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  avatarText: { fontWeight: "700" },
  name: { fontWeight: "600" },
  you: { fontWeight: "400" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statusText: {},
});
