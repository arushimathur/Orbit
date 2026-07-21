import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LocationPrecision } from "@orbit/shared";
import Screen from "../components/Screen";
import Button from "../components/Button";
import * as api from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import { useTheme } from "../theme/theme";

// "Share my location" off = paused indefinitely (a far-future sentinel), distinct from the
// time-limited quick-pause actions below, which both write to the same sharingPausedUntil field.
const INDEFINITE_PAUSE_ISO = new Date("2100-01-01T00:00:00.000Z").toISOString();

function untilTonight(): string {
  const d = new Date();
  d.setHours(22, 0, 0, 0);
  if (d <= new Date()) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export default function SharingPrivacyScreen() {
  const { user } = useAuth();
  const { circle } = useCircle();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [sharingPausedUntil, setSharingPausedUntil] = useState<string | null>(null);
  const [precision, setPrecision] = useState<LocationPrecision>("exact");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      Promise.all([api.getSharingStatus(), circle ? api.listMembers(circle.id) : Promise.resolve([])])
        .then(([status, members]) => {
          if (!isMounted) return;
          setSharingPausedUntil(status.sharingPausedUntil);
          const mine = members.find((m) => m.userId === user?.id);
          if (mine) setPrecision(mine.locationPrecision);
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

  const isPaused = !!sharingPausedUntil && new Date(sharingPausedUntil) > new Date();

  const onToggleSharing = async (value: boolean) => {
    setIsBusy(true);
    try {
      if (value) {
        const status = await api.resumeSharing();
        setSharingPausedUntil(status.sharingPausedUntil);
      } else {
        const status = await api.pauseSharing({ until: INDEFINITE_PAUSE_ISO });
        setSharingPausedUntil(status.sharingPausedUntil);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const onQuickPause = async (until: string) => {
    setIsBusy(true);
    try {
      const status = await api.pauseSharing({ until });
      setSharingPausedUntil(status.sharingPausedUntil);
    } finally {
      setIsBusy(false);
    }
  };

  const onSetPrecision = async (next: LocationPrecision) => {
    if (!circle || next === precision) return;
    setPrecision(next);
    await api.setCirclePrecision(circle.id, { precision: next });
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
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.foreground, fontSize: fontSize.base }]}>Share my location</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground, fontSize: fontSize.sm }]}>
              Family sees where you are, live
            </Text>
          </View>
          <Switch value={!isPaused} onValueChange={onToggleSharing} disabled={isBusy} />
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing(4), marginTop: spacing(4) }]}>
          <Text style={{ color: colors.accentForeground, fontSize: fontSize.sm }}>
            When you pause, family sees "{user?.name} paused sharing" — never a blank map. Privacy without secrecy.
          </Text>
        </View>

        <View style={[styles.quickRow, { marginTop: spacing(4) }]}>
          <View style={{ flex: 1, marginRight: spacing(2) }}>
            <Button
              title="Pause 1 hr"
              variant="outline"
              onPress={() => onQuickPause(new Date(Date.now() + 60 * 60 * 1000).toISOString())}
              disabled={isBusy}
            />
          </View>
          <View style={{ flex: 1, marginLeft: spacing(2) }}>
            <Button title="Until tonight" variant="outline" onPress={() => onQuickPause(untilTonight())} disabled={isBusy} />
          </View>
        </View>
      </View>

      <View style={cardStyle}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontSize: fontSize.xs, marginBottom: spacing(3) }]}>
          LOCATION PRECISION
        </Text>
        {(["exact", "city"] as LocationPrecision[]).map((option) => (
          <Pressable
            key={option}
            onPress={() => onSetPrecision(option)}
            style={[styles.row, { paddingVertical: spacing(2) }]}
          >
            <Text style={{ color: colors.foreground, fontSize: fontSize.base, flex: 1 }}>
              {option === "exact" ? "Exact location" : "City / area only"}
            </Text>
            <Ionicons
              name={precision === option ? "radio-button-on" : "radio-button-off"}
              size={fontSize.lg}
              color={precision === option ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center" },
  quickRow: { flexDirection: "row" },
  label: { fontWeight: "700" },
  hint: { marginTop: 2 },
  infoBox: {},
  sectionTitle: { fontWeight: "700", letterSpacing: 0.5 },
});
