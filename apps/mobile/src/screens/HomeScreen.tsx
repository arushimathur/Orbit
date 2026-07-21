import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MemberLocation, Notification } from "@orbit/shared";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import { useCircleLocations } from "../hooks/useCircleLocations";
import { useNicknames } from "../hooks/useNicknames";
import * as api from "../api/endpoints";
import { MainStackParamList } from "../navigation/RootNavigator";
import { startBackgroundLocationTracking } from "../location/backgroundLocationTask";
import BottomTabBar from "../components/BottomTabBar";
import MemberStatusLine from "../components/MemberStatusLine";
import FamilyMapView from "../components/FamilyMapView";
import { useTheme } from "../theme/theme";
import { latestEventsByActor } from "../utils/memberStatus";

type ViewMode = "list" | "map";

function MemberRow({
  member,
  isSelf,
  name,
  latestEvent,
  onPress,
  onLongPress,
}: {
  member: MemberLocation;
  isSelf: boolean;
  name: string;
  latestEvent: Notification | undefined;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const { colors, spacing, radius, fontSize, shadow } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
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
          {name.slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.base }]}>
          {name}
          {isSelf && <Text style={[styles.you, { color: colors.mutedForeground, fontSize: fontSize.sm }]}> you</Text>}
        </Text>
        <View style={styles.statusRow}>
          <MemberStatusLine ping={member.ping} latestEvent={latestEvent} sharingPausedUntil={member.sharingPausedUntil} />
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
  const { displayName } = useNicknames();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

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

  // Runs regardless of List/Map mode -- your own location needs to keep posting even if you
  // never look at the map view.
  useEffect(() => {
    startBackgroundLocationTracking().catch(() => undefined);
  }, []);

  if (!circle) return null;

  const members = Object.values(memberLocations).sort((a, b) => a.user.name.localeCompare(b.user.name));
  const latestByActor = latestEventsByActor(notifications);
  const homeCount = members.filter((m) => latestByActor[m.user.id]?.type === "arrived").length;
  const awayCount = members.length - homeCount;
  const isSoloCircle = members.length <= 1;

  const goToPerson = (userId: string) => navigation.navigate("Person", { userId });

  const onInviteWhatsApp = async () => {
    const text = `Join our family circle "${circle.name}" on Orbit: orbit://join/${circle.inviteCode} (code: ${circle.inviteCode})`;
    try {
      await Share.share({ message: text });
    } catch {
      // User dismissed the share sheet -- nothing to do.
    }
  };

  const onCopyCode = async () => {
    await Clipboard.setStringAsync(circle.inviteCode);
    Alert.alert("Copied", "Invite code copied to clipboard.");
  };

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
          <Pressable accessibilityLabel="You" onPress={() => navigation.navigate("You")} hitSlop={8}>
            <View style={[styles.headerAvatar, { backgroundColor: colors.primary, borderRadius: radius.full }]}>
              <Text style={[styles.headerAvatarText, { color: colors.primaryForeground }]}>
                {(user?.name ?? "?").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={[styles.toggleRow, { backgroundColor: colors.muted, borderRadius: radius.full, marginTop: spacing(3) }]}>
          {(["list", "map"] as ViewMode[]).map((mode) => {
            const isActive = viewMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setViewMode(mode)}
                style={[
                  styles.toggleItem,
                  { borderRadius: radius.full, backgroundColor: isActive ? colors.card : "transparent" },
                ]}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    { color: isActive ? colors.foreground : colors.mutedForeground, fontSize: fontSize.sm },
                  ]}
                >
                  {mode === "list" ? "List" : "Map"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isSoloCircle ? (
        <View style={styles.empty}>
          <Text style={styles.emptyWave}>👋</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontSize: fontSize.xl, marginTop: spacing(4) }]}>
            It's just you so far
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: spacing(2), marginBottom: spacing(6) },
            ]}
          >
            Orbit works once family joins. Invite them whenever you're ready — nothing else needs setup.
          </Text>
          <Pressable
            onPress={onInviteWhatsApp}
            style={[styles.emptyButton, { backgroundColor: "#25D366", borderRadius: radius.md, padding: spacing(4) }]}
          >
            <Text style={styles.emptyButtonText}>Invite on WhatsApp</Text>
          </Pressable>
          <Pressable onPress={onCopyCode} style={{ marginTop: spacing(3) }}>
            <Text style={{ color: colors.primary, fontSize: fontSize.sm }}>Copy code · {circle.inviteCode}</Text>
          </Pressable>
        </View>
      ) : viewMode === "map" ? (
        <FamilyMapView members={members} onSelectMember={goToPerson} latestByActor={latestByActor} displayName={displayName} />
      ) : (
        <FlatList
          style={styles.list}
          data={members}
          keyExtractor={(m) => m.user.id}
          contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(4) }}
          ListHeaderComponent={
            <Pressable
              onPress={() => setViewMode("map")}
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
              name={displayName(item.user.id, item.user.name)}
              latestEvent={latestByActor[item.user.id]}
              onPress={() => goToPerson(item.user.id)}
              onLongPress={
                item.user.id === user?.id
                  ? undefined
                  : () => navigation.navigate("RenameMember", { userId: item.user.id, currentName: item.user.name })
              }
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
  circleName: { fontWeight: "700" },
  headerAvatar: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerAvatarText: { fontWeight: "700" },
  toggleRow: { flexDirection: "row", padding: 3, alignSelf: "flex-start" },
  toggleItem: { paddingVertical: 6, paddingHorizontal: 18 },
  toggleLabel: { fontWeight: "600" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyWave: { fontSize: 40 },
  emptyTitle: { fontWeight: "700", textAlign: "center" },
  emptySubtitle: { textAlign: "center" },
  emptyButton: { alignSelf: "stretch" },
  emptyButtonText: { color: "#fff", fontWeight: "700", textAlign: "center" },
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
});
