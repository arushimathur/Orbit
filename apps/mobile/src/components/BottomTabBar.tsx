import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MainStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";

export type TabKey = "family" | "alerts";

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; screen: keyof MainStackParamList }[] = [
  { key: "family", label: "Family", icon: "people", screen: "Home" },
  { key: "alerts", label: "Alerts", icon: "notifications", screen: "Notifications" },
];

export default function BottomTabBar({ active }: { active: TabKey }) {
  const { colors, spacing, fontSize } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom || spacing(2),
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const color = isActive ? colors.primary : colors.mutedForeground;
        return (
          <Pressable
            key={tab.key}
            style={styles.item}
            onPress={() => {
              if (!isActive) navigation.navigate(tab.screen as never);
            }}
            hitSlop={8}
          >
            <Ionicons name={isActive ? tab.icon : (`${tab.icon}-outline` as keyof typeof Ionicons.glyphMap)} size={22} color={color} />
            <Text style={[styles.label, { color, fontSize: fontSize.xs, marginTop: spacing(1) }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontWeight: "600" },
});
