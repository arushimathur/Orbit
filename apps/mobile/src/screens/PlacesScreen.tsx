import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { CirclePlace, PlaceSuggestion } from "@orbit/shared";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import { MainStackParamList } from "../navigation/RootNavigator";
import Screen from "../components/Screen";
import Button from "../components/Button";
import FormError from "../components/FormError";
import { useTheme } from "../theme/theme";

// Frame 2a: zero-friction, auto-detected places. Home/Work collapse into one shared row
// that resolves to each member's own address instead of showing a separately-named place
// per person; custom places (Gym, Temple, ...) list individually.
export default function PlacesScreen() {
  const { user } = useAuth();
  const { circle } = useCircle();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [places, setPlaces] = useState<CirclePlace[]>([]);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<"home" | "work" | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsLoading(true);
      setError(null);
      setDismissedSuggestion(false);
      Promise.all([circle ? api.listCirclePlaces(circle.id) : Promise.resolve([]), api.suggestPlaces()])
        .then(([placesResult, suggestionsResult]) => {
          if (!isMounted) return;
          setPlaces(placesResult);
          setSuggestions(suggestionsResult);
        })
        .catch((e) => {
          if (isMounted) setError(e instanceof ApiError ? e.message : "Failed to load places");
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }, [circle]),
  );

  const onDelete = (place: CirclePlace) => {
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

  const homePlaces = places.filter((p) => p.kind === "home");
  const workPlaces = places.filter((p) => p.kind === "work");
  const customPlaces = places.filter((p) => p.kind === "custom");
  const suggestion = !dismissedSuggestion ? suggestions[0] : undefined;

  const cardStyle = [styles.card, shadow.sm, { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing(3) }];

  const renderGroupRow = (kind: "home" | "work", icon: keyof typeof Ionicons.glyphMap, entries: CirclePlace[]) => {
    if (entries.length === 0) return null;
    const isExpanded = expanded === kind;
    return (
      <View key={kind} style={cardStyle}>
        <Pressable style={[styles.row, { padding: spacing(4) }]} onPress={() => setExpanded(isExpanded ? null : kind)}>
          <Ionicons name={icon} size={fontSize.xl} color={colors.primary} style={{ marginRight: spacing(3) }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.base }]}>
              {kind === "home" ? "Home" : "Work"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontSize: fontSize.xs }]}>
              Everyone's own {kind}
            </Text>
          </View>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={fontSize.lg} color={colors.mutedForeground} />
        </Pressable>
        {isExpanded && (
          <View style={{ paddingHorizontal: spacing(4), paddingBottom: spacing(3) }}>
            {entries.map((entry) => (
              <View key={entry.id} style={[styles.memberRow, { borderTopColor: colors.border, paddingVertical: spacing(2) }]}>
                <Text style={{ color: colors.foreground, fontSize: fontSize.sm, flex: 1 }}>
                  {entry.userId === user?.id ? "You" : entry.ownerName}
                </Text>
                <Ionicons name="checkmark" size={fontSize.base} color={colors.primary} />
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen scroll center={false}>
      {suggestion && (
        <View
          style={[
            styles.suggestionCard,
            { backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing(4), marginBottom: spacing(4) },
          ]}
        >
          <Text style={{ color: colors.accentForeground, fontWeight: "700", fontSize: fontSize.sm }}>✨ Orbit noticed a place</Text>
          <Text style={{ color: colors.accentForeground, fontSize: fontSize.sm, marginTop: spacing(1), marginBottom: spacing(3) }}>
            You've been near a spot {suggestion.visitedDays} days recently.
          </Text>
          <View style={styles.suggestionActions}>
            <View style={{ flex: 1, marginRight: spacing(2) }}>
              <Button
                title="Add & label"
                onPress={() =>
                  navigation.navigate("AddPlace", { prefillLat: suggestion.lat, prefillLng: suggestion.lng })
                }
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing(2) }}>
              <Button title="Dismiss" variant="outline" onPress={() => setDismissedSuggestion(true)} />
            </View>
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontSize: fontSize.xs, marginBottom: spacing(2) }]}>
        SAVED · SHARED WITH FAMILY
      </Text>

      {renderGroupRow("home", "home-outline", homePlaces)}
      {renderGroupRow("work", "business-outline", workPlaces)}

      {customPlaces.map((item) => {
        const isDeleting = deletingId === item.id;
        return (
          <View key={item.id} style={cardStyle}>
            <View style={[styles.row, { padding: spacing(4) }]}>
              <Ionicons name="flag-outline" size={fontSize.xl} color={colors.primary} style={{ marginRight: spacing(3) }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.base }]}>{item.name}</Text>
                {item.userId !== user?.id && (
                  <Text style={[styles.subtitle, { color: colors.mutedForeground, fontSize: fontSize.xs }]}>
                    Added by {item.ownerName}
                  </Text>
                )}
              </View>
              <Pressable accessibilityLabel={`Delete ${item.name}`} onPress={() => onDelete(item)} disabled={isDeleting} hitSlop={8}>
                {isDeleting ? (
                  <ActivityIndicator color={colors.destructive} />
                ) : (
                  <Ionicons name="trash-outline" size={fontSize.lg} color={colors.destructive} />
                )}
              </Pressable>
            </View>
          </View>
        );
      })}

      {places.length === 0 && (
        <Text style={[styles.empty, { color: colors.mutedForeground, fontSize: fontSize.base }]}>
          No places saved yet.
        </Text>
      )}

      {error && <FormError message={error} />}

      <View style={{ marginTop: spacing(3) }}>
        <Button title="Add a place" onPress={() => navigation.navigate("AddPlace")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", overflow: "hidden" },
  suggestionCard: { width: "100%" },
  suggestionActions: { flexDirection: "row" },
  sectionTitle: { fontWeight: "700", letterSpacing: 0.5 },
  row: { flexDirection: "row", alignItems: "center" },
  memberRow: { flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth },
  name: { fontWeight: "600" },
  subtitle: { marginTop: 2 },
  empty: { textAlign: "center", marginTop: 24 },
});
