import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import Button from "../components/Button";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import { MainStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { circle, clearActiveCircle } = useCircle();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [isBusy, setIsBusy] = useState(false);

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

  const onLeaveCircle = () => {
    if (!circle) return;
    Alert.alert("Leave circle?", `You'll stop sharing your location with "${circle.name}".`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setIsBusy(true);
          try {
            await api.leaveCircle(circle.id);
            await clearActiveCircle();
          } catch (e) {
            Alert.alert("Couldn't leave circle", e instanceof ApiError ? e.message : "Something went wrong");
          } finally {
            setIsBusy(false);
          }
        },
      },
    ]);
  };

  const onLogout = () => {
    Alert.alert("Log out?", "You'll need to sign in again to see your circle.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          setIsBusy(true);
          try {
            await logout();
          } finally {
            setIsBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll={false} center={false}>
      <View style={cardStyle}>
        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={fontSize["2xl"]} color={colors.mutedForeground} />
          <Text style={[styles.rowText, { color: colors.foreground, fontSize: fontSize.base, marginLeft: spacing(3) }]}>
            {user?.name}
          </Text>
        </View>
      </View>

      <View style={cardStyle}>
        <Button title="My circles" variant="outline" onPress={() => navigation.navigate("Circles")} disabled={isBusy} />
      </View>

      {circle && (
        <View style={cardStyle}>
          <Button title="Leave circle" variant="outline" onPress={onLeaveCircle} disabled={isBusy} />
        </View>
      )}

      <View style={cardStyle}>
        <Button title="Log out" variant="outline" onPress={onLogout} disabled={isBusy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center" },
  rowText: { fontWeight: "600" },
});
