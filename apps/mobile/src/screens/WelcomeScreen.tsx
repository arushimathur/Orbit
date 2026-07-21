import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import Button from "../components/Button";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

// Frame 3a: "two doors, one screen" -- create vs join, before any identity is collected.
// Both paths land on Register (this app keeps email/password, not phone+OTP), which then
// leads into circle setup once signed in.
export default function WelcomeScreen({ navigation }: Props) {
  const { colors, spacing, radius, fontSize } = useTheme();

  return (
    <Screen>
      <View style={[styles.logo, { backgroundColor: colors.primary, borderRadius: radius.lg, marginBottom: spacing(6) }]}>
        <Text style={[styles.logoText, { color: colors.primaryForeground, fontSize: fontSize["3xl"] }]}>O</Text>
      </View>
      <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize["3xl"], marginBottom: spacing(3) }]}>
        Keep your family close, always.
      </Text>
      <Text
        style={[styles.subtitle, { color: colors.mutedForeground, fontSize: fontSize.base, marginBottom: spacing(8) }]}
      >
        Private location sharing for the people who matter. No ads, no strangers.
      </Text>
      <Button title="Start a family circle" onPress={() => navigation.navigate("Register")} />
      <View style={{ height: spacing(3) }} />
      <Button title="I have an invite code" variant="outline" onPress={() => navigation.navigate("Login")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 64, height: 64, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  logoText: { fontWeight: "700" },
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center" },
});
