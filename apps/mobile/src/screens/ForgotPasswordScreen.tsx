import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { forgotPassword } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import Screen from "../components/Screen";
import TextField from "../components/TextField";
import Button from "../components/Button";
import FormError from "../components/FormError";
import { useTheme } from "../theme/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword({ email });
      navigation.navigate("ResetPassword", { email });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize["3xl"], marginBottom: spacing(2) }]}>
        Reset your password
      </Text>
      <Text
        style={[styles.subtitle, { color: colors.mutedForeground, fontSize: fontSize.sm, marginBottom: spacing(8) }]}
      >
        We&apos;ll email you a 6-digit code to reset your password.
      </Text>
      <TextField
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {error && <FormError message={error} />}
      <Button title="Send code" onPress={onSubmit} disabled={!email} loading={isSubmitting} />
      <View style={{ height: spacing(4) }} />
      <Button title="Back to login" variant="outline" onPress={() => navigation.navigate("Login")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center" },
});
