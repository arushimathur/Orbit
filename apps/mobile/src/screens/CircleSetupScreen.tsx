import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as api from "../api/endpoints";
import { useCircle } from "../circle/CircleContext";
import { ApiError } from "../api/client";
import { MainStackParamList } from "../navigation/RootNavigator";
import Screen from "../components/Screen";
import TextField from "../components/TextField";
import Button from "../components/Button";
import FormError from "../components/FormError";
import { useTheme } from "../theme/theme";

const CODE_SUGGEST_DEBOUNCE_MS = 400;

// Frame 3a, step 3: "Name your circle -- code is derived from it". Two doors (create vs
// join) stay on one screen since most family members only ever join. Every create
// commits straight into LocationPermission -> InviteFamily regardless of whether this is
// the user's first circle or an additional one (asking again is harmless; the OS no-ops if
// permission is already granted, and both steps are skippable).
export default function CircleSetupScreen() {
  const { setActiveCircle } = useCircle();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [circleName, setCircleName] = useState("");
  const [suggestedCode, setSuggestedCode] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const skipNextSuggestRef = useRef(false);

  useEffect(() => {
    const trimmed = circleName.trim();
    if (trimmed.length < 2) {
      setSuggestedCode(null);
      return;
    }
    setIsSuggesting(true);
    const timeout = setTimeout(() => {
      api
        .suggestInviteCode(trimmed)
        .then((res) => setSuggestedCode(res.code))
        .catch(() => setSuggestedCode(null))
        .finally(() => setIsSuggesting(false));
    }, CODE_SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [circleName]);

  const onRegenerate = async () => {
    const trimmed = circleName.trim();
    if (trimmed.length < 2) return;
    setIsSuggesting(true);
    try {
      const res = await api.suggestInviteCode(trimmed, suggestedCode ?? undefined);
      setSuggestedCode(res.code);
    } finally {
      setIsSuggesting(false);
    }
  };

  const onCreate = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const circle = await api.createCircle({ name: circleName.trim(), inviteCode: suggestedCode ?? undefined });
      await setActiveCircle(circle);
      navigation.navigate("LocationPermission");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onJoin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const circle = await api.joinCircle({ inviteCode: inviteCode.toUpperCase() });
      await setActiveCircle(circle);
      if (navigation.canGoBack()) navigation.popToTop();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const cardStyle = [
    styles.card,
    shadow.sm,
    { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing(5), marginBottom: spacing(5) },
  ];

  return (
    <Screen>
      <View style={cardStyle}>
        <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize.xl, marginBottom: spacing(4) }]}>
          Name your family circle
        </Text>
        <TextField placeholder="Circle name (e.g. Mathur Family)" value={circleName} onChangeText={setCircleName} />

        {suggestedCode && (
          <View style={[styles.codePreview, { backgroundColor: colors.muted, borderRadius: radius.md, padding: spacing(4), marginBottom: spacing(4) }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.codeLabel, { color: colors.mutedForeground, fontSize: fontSize.xs }]}>
                Your shareable code
              </Text>
              <Text style={[styles.code, { color: colors.primary, fontSize: fontSize.xl }]}>{suggestedCode}</Text>
            </View>
            <Pressable onPress={onRegenerate} disabled={isSuggesting} hitSlop={8}>
              {isSuggesting ? (
                <ActivityIndicator color={colors.mutedForeground} />
              ) : (
                <Ionicons name="refresh" size={fontSize.lg} color={colors.mutedForeground} />
              )}
            </Pressable>
          </View>
        )}

        <Button title="Create circle" onPress={onCreate} disabled={!circleName.trim()} />
      </View>

      <View style={cardStyle}>
        <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize.xl, marginBottom: spacing(4) }]}>
          Or join one
        </Text>
        <TextField
          placeholder="Invite code"
          autoCapitalize="characters"
          value={inviteCode}
          onChangeText={setInviteCode}
        />
        <Button title="Join circle" variant="secondary" onPress={onJoin} disabled={inviteCode.trim().length < 4} />
      </View>

      {error && <FormError message={error} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  title: { fontWeight: "700", textAlign: "center" },
  codePreview: { flexDirection: "row", alignItems: "center" },
  codeLabel: { fontWeight: "700", letterSpacing: 0.5 },
  code: { fontWeight: "800", letterSpacing: 2, marginTop: 2 },
});
