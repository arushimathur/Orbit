import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { CircleMember } from "@orbit/shared";
import Screen from "../components/Screen";
import TextField from "../components/TextField";
import * as api from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import { useNicknames } from "../hooks/useNicknames";
import { useTheme } from "../theme/theme";

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function NotificationPreferencesScreen() {
  const { user } = useAuth();
  const { circle } = useCircle();
  const { displayName } = useNicknames();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [notifyArrivals, setNotifyArrivals] = useState(true);
  const [notifyLowBattery, setNotifyLowBattery] = useState(true);
  const [notifyRunningLate, setNotifyRunningLate] = useState(false);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      Promise.all([
        api.getPreferences(),
        api.listMutedMembers(),
        circle ? api.listMembers(circle.id) : Promise.resolve([]),
      ])
        .then(([prefs, muted, circleMembers]) => {
          if (!isMounted) return;
          setNotifyArrivals(prefs.notifyArrivals);
          setNotifyLowBattery(prefs.notifyLowBattery);
          setNotifyRunningLate(prefs.notifyRunningLate);
          setQuietStart(prefs.quietHoursStart ?? "");
          setQuietEnd(prefs.quietHoursEnd ?? "");
          setMutedIds(new Set(muted.map((m) => m.userId)));
          setMembers(circleMembers.filter((m) => m.userId !== user?.id));
        })
        .catch(() => undefined)
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }, [circle, user?.id]),
  );

  const onToggleArrivals = async (value: boolean) => {
    setNotifyArrivals(value);
    await api.updatePreferences({ notifyArrivals: value });
  };
  const onToggleLowBattery = async (value: boolean) => {
    setNotifyLowBattery(value);
    await api.updatePreferences({ notifyLowBattery: value });
  };
  const onToggleRunningLate = async (value: boolean) => {
    setNotifyRunningLate(value);
    await api.updatePreferences({ notifyRunningLate: value });
  };

  const onQuietHoursBlur = async () => {
    const start = HHMM_RE.test(quietStart) ? quietStart : null;
    const end = HHMM_RE.test(quietEnd) ? quietEnd : null;
    await api.updatePreferences({ quietHoursStart: start, quietHoursEnd: end });
  };

  const onToggleMute = async (memberId: string, muted: boolean) => {
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (muted) next.add(memberId);
      else next.delete(memberId);
      return next;
    });
    if (muted) await api.muteMember(memberId);
    else await api.unmuteMember(memberId);
  };

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const cardStyle = [styles.card, shadow.sm, { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing(5), marginBottom: spacing(5) }];

  return (
    <Screen scroll center={false}>
      <View style={cardStyle}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontSize: fontSize.xs, marginBottom: spacing(3) }]}>
          TELL ME WHEN…
        </Text>
        <View style={[styles.row, { marginBottom: spacing(4) }]}>
          <Text style={{ color: colors.foreground, fontSize: fontSize.base, flex: 1 }}>Someone reaches a place</Text>
          <Switch value={notifyArrivals} onValueChange={onToggleArrivals} />
        </View>
        <View style={[styles.row, { marginBottom: spacing(4) }]}>
          <Text style={{ color: colors.foreground, fontSize: fontSize.base, flex: 1 }}>Low battery in the circle</Text>
          <Switch value={notifyLowBattery} onValueChange={onToggleLowBattery} />
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.foreground, fontSize: fontSize.base, flex: 1 }}>Someone runs late vs usual</Text>
          <Switch value={notifyRunningLate} onValueChange={onToggleRunningLate} />
        </View>
      </View>

      {members.length > 0 && (
        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontSize: fontSize.xs, marginBottom: spacing(3) }]}>
            PER PERSON
          </Text>
          {members.map((m, index) => (
            <View
              key={m.userId}
              style={[styles.row, { paddingVertical: spacing(2), borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.muted, borderRadius: radius.full, marginRight: spacing(3) }]}>
                <Text style={{ color: colors.mutedForeground, fontWeight: "700" }}>
                  {displayName(m.userId, m.user.name).slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={{ color: colors.foreground, fontSize: fontSize.base, flex: 1 }}>
                {displayName(m.userId, m.user.name)} · alerts
              </Text>
              <Switch value={!mutedIds.has(m.userId)} onValueChange={(v) => onToggleMute(m.userId, !v)} />
            </View>
          ))}
        </View>
      )}

      <View style={cardStyle}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontSize: fontSize.xs, marginBottom: spacing(3) }]}>
          QUIET HOURS
        </Text>
        <Text style={[styles.hint, { color: colors.mutedForeground, fontSize: fontSize.sm, marginBottom: spacing(3) }]}>
          24-hour time (e.g. 22:00). Push notifications are held during this window; nothing is lost from Alerts.
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: spacing(2) }}>
            <TextField
              label="From"
              placeholder="22:00"
              value={quietStart}
              onChangeText={setQuietStart}
              onBlur={onQuietHoursBlur}
              maxLength={5}
            />
          </View>
          <View style={{ flex: 1, marginLeft: spacing(2) }}>
            <TextField
              label="To"
              placeholder="07:00"
              value={quietEnd}
              onChangeText={setQuietEnd}
              onBlur={onQuietHoursBlur}
              maxLength={5}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontWeight: "700", letterSpacing: 0.5 },
  hint: {},
});
