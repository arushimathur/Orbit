import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CirclePreview } from "@orbit/shared";
import Screen from "../components/Screen";
import Button from "../components/Button";
import FormError from "../components/FormError";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { useCircle } from "../circle/CircleContext";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";

type Props = NativeStackScreenProps<MainStackParamList, "JoinPreview">;

// Deep-link landing screen for orbit://join/:inviteCode (frame 3a, "join path"). Shows who
// you'd be joining before committing -- only reachable while already signed in, see the
// `linking` config note in RootNavigator.
export default function JoinPreviewScreen({ navigation, route }: Props) {
  const { inviteCode } = route.params;
  const { setActiveCircle } = useCircle();
  const { colors, spacing, radius, fontSize } = useTheme();
  const [preview, setPreview] = useState<CirclePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .getCirclePreview(inviteCode)
      .then((result) => {
        if (isMounted) setPreview(result);
      })
      .catch((e) => {
        if (isMounted) setError(e instanceof ApiError ? e.message : "Couldn't load that invite");
      });
    return () => {
      isMounted = false;
    };
  }, [inviteCode]);

  const onJoin = async () => {
    setIsJoining(true);
    setError(null);
    try {
      const circle = await api.joinCircle({ inviteCode });
      await setActiveCircle(circle);
      if (navigation.canGoBack()) navigation.popToTop();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsJoining(false);
    }
  };

  if (error && !preview) {
    return (
      <Screen>
        <FormError message={error} />
        <Button title="Not now" variant="ghost" onPress={() => navigation.canGoBack() && navigation.goBack()} />
      </Screen>
    );
  }

  if (!preview) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.avatarRow}>
        {preview.memberInitials.map((initial, i) => (
          <View
            key={i}
            style={[
              styles.avatar,
              { backgroundColor: colors.muted, borderRadius: radius.full, marginLeft: i === 0 ? 0 : -12, borderColor: colors.background },
            ]}
          >
            <Text style={{ color: colors.mutedForeground, fontWeight: "700" }}>{initial}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize["2xl"], marginTop: spacing(5), marginBottom: spacing(3) }]}>
        Join the {preview.name}?
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontSize: fontSize.base, marginBottom: spacing(6) }]}>
        You'll share your location with {preview.memberCount} member{preview.memberCount === 1 ? "" : "s"} and see theirs.
      </Text>
      {error && <FormError message={error} />}
      <Button title="Join circle" onPress={onJoin} loading={isJoining} />
      <View style={{ height: spacing(3) }} />
      <Button title="Not now" variant="ghost" onPress={() => navigation.canGoBack() && navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarRow: { flexDirection: "row", alignSelf: "center" },
  avatar: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center" },
});
