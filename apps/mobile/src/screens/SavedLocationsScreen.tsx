import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { SavedLocation } from "@orbit/shared";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { MainStackParamList } from "../navigation/RootNavigator";
import Screen from "../components/Screen";
import Button from "../components/Button";
import FormError from "../components/FormError";
import { useTheme } from "../theme/theme";

export default function SavedLocationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [places, setPlaces] = useState<SavedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsLoading(true);
      setError(null);
      api
        .listPlaces()
        .then((result) => {
          if (isMounted) setPlaces(result);
        })
        .catch((e) => {
          if (isMounted) setError(e instanceof Error ? e.message : "Failed to load saved places");
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }, []),
  );

  const onDelete = (place: SavedLocation) => {
    Alert.alert("Delete this place?", `"${place.name}" will no longer trigger arrival/departure alerts.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(place.id);
          try {
            await api.deletePlace(place.id);
            setPlaces((prev) => prev.filter((p) => p.id !== place.id));
          } catch (e) {
            Alert.alert("Couldn't delete place", e instanceof ApiError ? e.message : "Something went wrong");
          } finally {
            setDeletingId(null);
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
          data={places}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: spacing(4) }}
          renderItem={({ item }) => {
            const isDeleting = deletingId === item.id;
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
                  },
                ]}
              >
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.base }]}>
                    {item.name}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={`Delete ${item.name}`}
                  onPress={() => onDelete(item)}
                  disabled={isDeleting}
                  hitSlop={8}
                  style={{ marginLeft: spacing(3) }}
                >
                  {isDeleting ? (
                    <ActivityIndicator color={colors.destructive} />
                  ) : (
                    <Ionicons name="trash-outline" size={fontSize.xl} color={colors.destructive} />
                  )}
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.mutedForeground, fontSize: fontSize.base }]}>
              You haven't saved any places yet.
            </Text>
          }
        />
      )}

      {error && <FormError message={error} />}

      <Button title="Add a place" onPress={() => navigation.navigate("AddPlace")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 24 },
});
