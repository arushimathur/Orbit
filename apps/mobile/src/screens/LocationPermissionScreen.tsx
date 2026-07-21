import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { startBackgroundLocationTracking } from "../location/backgroundLocationTask";
import { MainStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";

// Frame 3a, step 4: the permission ask is earned -- explained in family language right
// before the OS prompt, rather than surprising the user with a system dialog on first launch.
export default function LocationPermissionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors, spacing, radius, fontSize } = useTheme();
  const [isRequesting, setIsRequesting] = useState(false);

  const proceed = () => navigation.navigate("InviteFamily");

  const onAllow = async () => {
    setIsRequesting(true);
    try {
      await startBackgroundLocationTracking();
    } finally {
      setIsRequesting(false);
      proceed();
    }
  };

  return (
    <Screen>
      <View style={[styles.iconWrap, { backgroundColor: colors.muted, borderRadius: radius.full, marginBottom: spacing(6) }]}>
        <Ionicons name="location" size={36} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize["2xl"], marginBottom: spacing(3) }]}>
        Share location with your family
      </Text>
      <Text
        style={[styles.subtitle, { color: colors.mutedForeground, fontSize: fontSize.base, marginBottom: spacing(6) }]}
      >
        Orbit needs "Allow all the time" so family can see you even when the app is closed — that's the whole point.
      </Text>
      <View style={[styles.infoBox, { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing(4), marginBottom: spacing(6) }]}>
        <Text style={{ color: colors.accentForeground, fontSize: fontSize.sm }}>
          Only your circle sees it. You can pause anytime, and everyone will know you paused.
        </Text>
      </View>
      <Button title="Allow location" onPress={onAllow} loading={isRequesting} />
      <View style={{ height: spacing(3) }} />
      <Button title="Not now" variant="ghost" onPress={proceed} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 72, height: 72, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center" },
  infoBox: {},
});
