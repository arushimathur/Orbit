import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as api from "../api/endpoints";
import { useCircle } from "../circle/CircleContext";
import { ApiError } from "../api/client";
import Screen from "../components/Screen";
import TextField from "../components/TextField";
import Button from "../components/Button";
import FormError from "../components/FormError";
import { useTheme } from "../theme/theme";

export default function CircleSetupScreen() {
  const { setActiveCircle } = useCircle();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [circleName, setCircleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onCreate = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const circle = await api.createCircle({ name: circleName });
      await setActiveCircle(circle);
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
    {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing(5),
      marginBottom: spacing(5),
    },
  ];

  return (
    <Screen>
      <View style={cardStyle}>
        <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize.xl, marginBottom: spacing(4) }]}>
          Start a circle
        </Text>
        <TextField placeholder="Circle name (e.g. Family)" value={circleName} onChangeText={setCircleName} />
        <Button title="Create circle" onPress={onCreate} disabled={!circleName} />
      </View>

      <View style={cardStyle}>
        <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize.xl, marginBottom: spacing(4) }]}>
          Or join one
        </Text>
        <TextField
          placeholder="8-character invite code"
          autoCapitalize="characters"
          value={inviteCode}
          onChangeText={setInviteCode}
        />
        <Button title="Join circle" variant="secondary" onPress={onJoin} disabled={inviteCode.length !== 8} />
      </View>

      {error && <FormError message={error} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  title: { fontWeight: "700", textAlign: "center" },
});
