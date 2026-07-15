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

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { colors, spacing, fontSize } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ name, email, password });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize["3xl"], marginBottom: spacing(8) }]}>
        Create your account
      </Text>
      <TextField placeholder="Name" value={name} onChangeText={setName} />
      <TextField
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        placeholder="Password (min 8 characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <FormError message={error} />}
      <Button
        title="Sign up"
        onPress={onSubmit}
        disabled={!name || !email || password.length < 8}
        loading={isSubmitting}
      />
      <View style={{ height: spacing(4) }} />
      <Button title="Back to login" variant="outline" onPress={() => navigation.navigate("Login")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", textAlign: "center" },
});
