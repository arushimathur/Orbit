import React, { useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { resetPassword } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword({ email, code, newPassword });
      Alert.alert("Password reset", "You can now log in with your new password.");
      navigation.navigate("Login");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = /^\d{6}$/.test(code) && newPassword.length >= 8 && confirmPassword.length >= 8;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your code</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {email}.</Text>
      <TextInput
        style={styles.input}
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      <TextInput
        style={styles.input}
        placeholder="New password (min 8 characters)"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm new password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {isSubmitting ? (
        <ActivityIndicator />
      ) : (
        <Button title="Reset password" onPress={onSubmit} disabled={!canSubmit} />
      )}
      <View style={styles.spacer} />
      <Button title="Back to login" onPress={() => navigation.navigate("Login")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 24, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  error: { color: "crimson", marginBottom: 12 },
  spacer: { height: 16 },
});
