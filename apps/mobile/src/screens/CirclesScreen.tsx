import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Circle } from "@orbit/shared";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { useCircle } from "../circle/CircleContext";
import { MainStackParamList } from "../navigation/RootNavigator";
import Screen from "../components/Screen";
import Button from "../components/Button";
import FormError from "../components/FormError";
import { useTheme } from "../theme/theme";

export default function CirclesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { circle: activeCircle, setActiveCircle, clearActiveCircle } = useCircle();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const isBusy = switchingId !== null || leavingId !== null;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsLoading(true);
      setError(null);
      api
        .getMyCircles()
        .then((result) => {
          if (isMounted) setCircles(result);
        })
        .catch((e) => {
          if (isMounted) setError(e instanceof Error ? e.message : "Failed to load circles");
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }, []),
  );

  const onSelect = async (circle: Circle) => {
    if (circle.id === activeCircle?.id || isBusy) return;
    setSwitchingId(circle.id);
    try {
      await setActiveCircle(circle);
      navigation.navigate("Map");
    } finally {
      setSwitchingId(null);
    }
  };

  const onLeave = (circle: Circle) => {
    Alert.alert("Leave circle?", `You'll stop sharing your location with "${circle.name}".`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setLeavingId(circle.id);
          try {
            await api.leaveCircle(circle.id);
            if (circle.id === activeCircle?.id) await clearActiveCircle();
            setCircles((prev) => prev.filter((c) => c.id !== circle.id));
          } catch (e) {
            Alert.alert("Couldn't leave circle", e instanceof ApiError ? e.message : "Something went wrong");
          } finally {
            setLeavingId(null);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll={false} center={false}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={circles}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingBottom: spacing(4) }}
          renderItem={({ item }) => {
            const isActive = item.id === activeCircle?.id;
            const isLeaving = leavingId === item.id;
            return (
              <View
                style={[
                  styles.row,
                  shadow.sm,
                  {
                    backgroundColor: colors.card,
                    borderRadius: radius.lg,
                    padding: spacing(4),
                    marginBottom: spacing(3),
                    borderWidth: isActive ? 2 : 0,
                    borderColor: colors.primary,
                    opacity: isBusy && switchingId !== item.id && !isLeaving ? 0.5 : 1,
                  },
                ]}
              >
                <Pressable
                  style={styles.rowMain}
                  onPress={() => onSelect(item)}
                  disabled={isBusy}
                  hitSlop={8}
                >
                  <View style={{ flexShrink: 1 }}>
                    <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.base }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.code, { color: colors.mutedForeground, fontSize: fontSize.sm }]}>
                      Invite code: {item.inviteCode}
                    </Text>
                  </View>
                  {switchingId === item.id ? (
                    <ActivityIndicator color={colors.primary} style={{ marginLeft: spacing(3) }} />
                  ) : isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={fontSize["2xl"]}
                      color={colors.primary}
                      style={{ marginLeft: spacing(3) }}
                    />
                  ) : null}
                </Pressable>
                <Pressable
                  accessibilityLabel={`Leave ${item.name}`}
                  onPress={() => onLeave(item)}
                  disabled={isBusy}
                  hitSlop={8}
                  style={{ marginLeft: spacing(3) }}
                >
                  {isLeaving ? (
                    <ActivityIndicator color={colors.destructive} />
                  ) : (
                    <Ionicons name="exit-outline" size={fontSize.xl} color={colors.destructive} />
                  )}
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.mutedForeground, fontSize: fontSize.base }]}>
              You're not in any circles yet.
            </Text>
          }
        />
      )}

      {error && <FormError message={error} />}

      <Button title="Create or join a circle" variant="secondary" onPress={() => navigation.navigate("CircleSetup")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontWeight: "600" },
  code: { marginTop: 2 },
  empty: { textAlign: "center", marginTop: 24 },
});
