import React from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { useCircle } from "../circle/CircleContext";
import { MainStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";

// Frame 3a, step 5: the code carries straight over from the circle just created --
// nothing new to type or remember.
export default function InviteFamilyScreen() {
  const { circle } = useCircle();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors, spacing, radius, fontSize } = useTheme();

  const done = () => {
    if (navigation.canGoBack()) navigation.popToTop();
  };

  const onShareWhatsApp = async () => {
    if (!circle) return;
    const message = `Join our family circle "${circle.name}" on Orbit: orbit://join/${circle.inviteCode} (code: ${circle.inviteCode})`;
    try {
      await Share.share({ message });
    } finally {
      done();
    }
  };

  const onCopy = async () => {
    if (!circle) return;
    await Clipboard.setStringAsync(circle.inviteCode);
    Alert.alert("Copied", "Invite link copied to clipboard.");
  };

  if (!circle) return null;

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.foreground, fontSize: fontSize["2xl"], marginBottom: spacing(3) }]}>
        Invite your family
      </Text>
      <Text
        style={[styles.subtitle, { color: colors.mutedForeground, fontSize: fontSize.base, marginBottom: spacing(6) }]}
      >
        This code came from your circle name. Share the link on WhatsApp — they tap it and land straight inside.
      </Text>

      <View
        style={[
          styles.codeBox,
          { borderColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing(6), marginBottom: spacing(6) },
        ]}
      >
        <Text style={[styles.codeLabel, { color: colors.mutedForeground, fontSize: fontSize.xs }]}>CIRCLE CODE</Text>
        <Text style={[styles.code, { color: colors.foreground, fontSize: fontSize["3xl"] }]}>{circle.inviteCode}</Text>
      </View>

      <Button title="Share on WhatsApp" onPress={onShareWhatsApp} />
      <View style={{ height: spacing(3) }} />
      <Button title="Copy invite link" variant="outline" onPress={onCopy} />
      <View style={{ height: spacing(3) }} />
      <Button title="Skip — I'll invite later" variant="ghost" onPress={done} />

      <View style={[styles.lockRow, { marginTop: spacing(6) }]}>
        <Ionicons name="lock-closed-outline" size={fontSize.sm} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, fontSize: fontSize.xs, marginLeft: 6 }}>
          Only people with this code can join.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center" },
  codeBox: { borderWidth: 2, borderStyle: "dashed", alignItems: "center", width: "100%" },
  codeLabel: { fontWeight: "700", letterSpacing: 1 },
  code: { fontWeight: "800", letterSpacing: 4, marginTop: 4 },
  lockRow: { flexDirection: "row", alignItems: "center" },
});
