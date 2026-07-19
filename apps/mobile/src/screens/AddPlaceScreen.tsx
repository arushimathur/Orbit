import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { MAP_STYLE_URL } from "../config";
import { MainStackParamList } from "../navigation/RootNavigator";
import Button from "../components/Button";
import TextField from "../components/TextField";
import FormError from "../components/FormError";
import { useTheme } from "../theme/theme";

const DEFAULT_RADIUS_M = 150;
const RADIUS_PRESETS = [100, 150, 250, 500];

export default function AddPlaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  const [coordinate, setCoordinate] = useState<[number, number] | null>(null);
  const [name, setName] = useState("");
  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then((current) => setCenter([current.coords.longitude, current.coords.latitude]))
      .catch(() => {
        // Fine to fall back to the default [0, 0] world view if this fails -- the user can
        // still pan/zoom the map manually to find where they want to drop a pin.
      });
  }, []);

  const onMapPress = (feature: GeoJSON.Feature) => {
    if (feature.geometry.type !== "Point") return;
    const [lng, lat] = feature.geometry.coordinates;
    setCoordinate([lng, lat]);
  };

  const onSave = async () => {
    if (!coordinate || !name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.createPlace({ name: name.trim(), lat: coordinate[1], lng: coordinate[0], radiusM });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <MapLibreGL.MapView style={styles.map} mapStyle={MAP_STYLE_URL} onPress={onMapPress}>
        <MapLibreGL.Camera zoomLevel={14} centerCoordinate={center} />
        {coordinate && (
          <MapLibreGL.PointAnnotation id="new-place" coordinate={coordinate}>
            <View
              style={[
                styles.pin,
                shadow.sm,
                { backgroundColor: colors.primary, borderRadius: radius.full, borderColor: colors.card },
              ]}
            />
          </MapLibreGL.PointAnnotation>
        )}
      </MapLibreGL.MapView>

      <View style={[styles.form, { padding: spacing(6), paddingBottom: insets.bottom + spacing(6) }]}>
        <Text style={[styles.hint, { color: colors.mutedForeground, fontSize: fontSize.sm, marginBottom: spacing(3) }]}>
          {coordinate ? "Tap the map to move the pin" : "Tap the map to drop a pin"}
        </Text>
        <TextField label="Name" placeholder="Home" value={name} onChangeText={setName} />
        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, fontSize: fontSize.sm, marginBottom: spacing(1.5) },
          ]}
        >
          Radius
        </Text>
        <View style={[styles.presetsRow, { marginBottom: spacing(4) }]}>
          {RADIUS_PRESETS.map((preset) => {
            const isSelected = preset === radiusM;
            return (
              <Text
                key={preset}
                onPress={() => setRadiusM(preset)}
                style={[
                  styles.preset,
                  {
                    borderRadius: radius.md,
                    paddingVertical: spacing(2),
                    paddingHorizontal: spacing(3),
                    marginRight: spacing(2),
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : "transparent",
                    color: isSelected ? colors.primaryForeground : colors.foreground,
                    fontSize: fontSize.sm,
                  },
                ]}
              >
                {preset}m
              </Text>
            );
          })}
        </View>

        {error && <FormError message={error} />}

        <Button title="Save" onPress={onSave} disabled={!coordinate || !name.trim()} loading={isSaving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  form: {},
  hint: { textAlign: "center" },
  label: { fontWeight: "500" },
  presetsRow: { flexDirection: "row" },
  preset: { borderWidth: 1, fontWeight: "600" },
  pin: {
    width: 24,
    height: 24,
    borderWidth: 2,
  },
});
