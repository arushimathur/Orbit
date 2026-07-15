import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import Screen from "../components/Screen";
import TextField from "../components/TextField";
import Button from "../components/Button";
import FormError from "../components/FormError";
import { useTheme } from "../theme/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { colors, spacing, fontSize } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize["4xl"], marginBottom: spacing(8) }]}>
        Orbit
      </Text>
      <TextField
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error && <FormError message={error} />}
      <Button title="Log in" onPress={onSubmit} disabled={!email || !password} loading={isSubmitting} />
      <View style={{ height: spacing(3) }} />
      <Button title="Forgot password?" variant="ghost" onPress={() => navigation.navigate("ForgotPassword")} />
      <View style={{ height: spacing(6) }} />
      <Button title="Create an account" variant="outline" onPress={() => navigation.navigate("Register")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", textAlign: "center" },
});
