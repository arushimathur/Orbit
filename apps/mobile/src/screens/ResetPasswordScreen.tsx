import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { resetPassword } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import Screen from "../components/Screen";
import TextField from "../components/TextField";
import Button from "../components/Button";
import FormError from "../components/FormError";
import { useTheme } from "../theme/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { colors, spacing, fontSize } = useTheme();
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
    <Screen>
      <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize["3xl"], marginBottom: spacing(2) }]}>
        Enter your code
      </Text>
      <Text
        style={[styles.subtitle, { color: colors.mutedForeground, fontSize: fontSize.sm, marginBottom: spacing(8) }]}
      >
        We sent a 6-digit code to {email}.
      </Text>
      <TextField
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      <TextField
        placeholder="New password (min 8 characters)"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextField
        placeholder="Confirm new password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      {error && <FormError message={error} />}
      <Button title="Reset password" onPress={onSubmit} disabled={!canSubmit} loading={isSubmitting} />
      <View style={{ height: spacing(4) }} />
      <Button title="Back to login" variant="outline" onPress={() => navigation.navigate("Login")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center" },
});
