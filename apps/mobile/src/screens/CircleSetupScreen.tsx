import React, { useState } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from "react-native";
import * as api from "../api/endpoints";
import { useCircle } from "../circle/CircleContext";
import { ApiError } from "../api/client";

export default function CircleSetupScreen() {
  const { setActiveCircle } = useCircle();
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
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start a circle</Text>
      <TextInput
        style={styles.input}
        placeholder="Circle name (e.g. Family)"
        value={circleName}
        onChangeText={setCircleName}
      />
      <Button title="Create circle" onPress={onCreate} disabled={!circleName} />

      <View style={styles.divider} />

      <Text style={styles.title}>Or join one</Text>
      <TextInput
        style={styles.input}
        placeholder="8-character invite code"
        autoCapitalize="characters"
        value={inviteCode}
        onChangeText={setInviteCode}
      />
      <Button title="Join circle" onPress={onJoin} disabled={inviteCode.length !== 8} />

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  divider: { height: 32 },
  error: { color: "crimson", marginTop: 16 },
});
