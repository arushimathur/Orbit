import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapLibreGL, { CameraRef, PointAnnotationRef } from "@maplibre/maplibre-react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PlaceKind } from "@orbit/shared";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { GeocodeResult, searchPlaces } from "../api/geocoding";
import { MAP_STYLE_URL } from "../config";
import { MainStackParamList } from "../navigation/RootNavigator";
import Button from "../components/Button";
import TextField from "../components/TextField";
import FormError from "../components/FormError";
import { useTheme } from "../theme/theme";

const DEFAULT_RADIUS_M = 150;
const DEFAULT_CENTER: [number, number] = [0, 0];
const SEARCH_DEBOUNCE_MS = 400;

// Quick-label chips (frame 2a): tapping one fills the label (and, for Home/Work, the
// special per-person `kind`) so the user's only job is confirming the pin, not typing.
const QUICK_LABELS: { label: string; icon: string; kind: PlaceKind }[] = [
  { label: "Gym", icon: "🏋️", kind: "custom" },
  { label: "Restaurant", icon: "🍽️", kind: "custom" },
  { label: "Grandma's", icon: "👵", kind: "custom" },
  { label: "Temple", icon: "🛕", kind: "custom" },
  { label: "Home", icon: "🏠", kind: "home" },
  { label: "Work", icon: "💼", kind: "work" },
];

export default function AddPlaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, "AddPlace">>();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);
  const pinRef = useRef<PointAnnotationRef>(null);
  const nameInputRef = useRef<TextInput>(null);
  const skipNextSearchRef = useRef(false);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [coordinate, setCoordinate] = useState<[number, number] | null>(
    route.params?.prefillLat !== undefined && route.params?.prefillLng !== undefined
      ? [route.params.prefillLng, route.params.prefillLat]
      : null,
  );
  const [name, setName] = useState<string>(route.params?.prefillName ?? "");
  const [kind, setKind] = useState<PlaceKind>(route.params?.kind ?? "custom");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // A prefilled suggestion already has coordinates -- center there directly instead of
    // waiting on a fresh GPS fix.
    if (coordinate) {
      setCenter(coordinate);
      return;
    }
    let isMounted = true;
    (async () => {
      // A cached fix (near-instant) lets the map mount already centered in the common case --
      // this app runs background location tracking, so a recent one is almost always available.
      // Falling straight to getCurrentPositionAsync() first is what made this screen feel slow:
      // it can take several seconds, during which the map either sits blank or has to fly from
      // a default center once the fix finally arrives.
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last && isMounted) {
          setCenter([last.coords.longitude, last.coords.latitude]);
          return;
        }
      } catch {
        // fall through to a fresh fix below
      }
      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (isMounted) setCenter([current.coords.longitude, current.coords.latitude]);
      } catch {
        if (isMounted) setCenter(DEFAULT_CENTER);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Set imperatively (rather than via Camera's `defaultSettings` prop) so the initial
    // placement goes through the same, known-working code path as the search-selection flight
    // below -- `defaultSettings` is captured once into a native "default stop" that this library
    // version doesn't reliably apply (zoomLevel in particular was observed being ignored).
    // Also gated on isMapReady: firing setCamera before the native map has finished its own
    // initialization gets silently dropped, leaving the map at its default world view -- this
    // was intermittent because it depends on which finishes first, the GPS fix or map init.
    if (center && isMapReady) {
      cameraRef.current?.setCamera({ centerCoordinate: center, zoomLevel: 14, animationDuration: 0 });
    }
  }, [center, isMapReady]);

  useEffect(() => {
    // Selecting a result sets `query` to that result's own display name (so the field shows what
    // got picked) -- without this guard, that assignment re-triggers this same effect and searches
    // for the address text itself, reopening the dropdown with near-duplicate results right after
    // the user just closed it by picking one.
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(() => {
      searchPlaces(trimmed, center ?? undefined)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-searching on every center update
    // (a GPS fix arriving mid-typing) would restart the debounce and could flip results underneath
    // the user; center only needs to be current at the moment a search actually fires.
  }, [query]);

  const onMapPress = (feature: GeoJSON.Feature) => {
    if (feature.geometry.type !== "Point") return;
    const [lng, lat] = feature.geometry.coordinates;
    setCoordinate([lng, lat]);
  };

  // Tapping the dropped pin jumps straight to naming + saving it, instead of requiring the user
  // to notice and scroll to the form below on their own.
  const onPinSelected = () => {
    nameInputRef.current?.focus();
  };

  const onSelectResult = (result: GeocodeResult) => {
    const next: [number, number] = [result.lng, result.lat];
    setCoordinate(next);
    setName((prev) => prev || result.displayName.split(",")[0]);
    skipNextSearchRef.current = true;
    setQuery(result.displayName);
    setResults([]);
    cameraRef.current?.setCamera({ centerCoordinate: next, zoomLevel: 15, animationDuration: 700 });
  };

  const onSave = async () => {
    if (!coordinate || !name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.createPlace({ name: name.trim(), kind, lat: coordinate[1], lng: coordinate[0], radiusM: DEFAULT_RADIUS_M });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const onQuickLabel = (chip: (typeof QUICK_LABELS)[number]) => {
    setName(chip.label);
    setKind(chip.kind);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.mapContainer}>
        {center ? (
          <MapLibreGL.MapView
            style={styles.map}
            mapStyle={MAP_STYLE_URL}
            onPress={onMapPress}
            onDidFinishLoadingMap={() => setIsMapReady(true)}
          >
            <MapLibreGL.Camera ref={cameraRef} />
            <MapLibreGL.UserLocation visible androidRenderMode="normal" />
            {coordinate && (
              <MapLibreGL.PointAnnotation
                ref={pinRef}
                id="new-place"
                coordinate={coordinate}
                onSelected={onPinSelected}
              >
                <View
                  onLayout={() => pinRef.current?.refresh()}
                  style={[
                    styles.pin,
                    shadow.sm,
                    { backgroundColor: colors.primary, borderRadius: radius.full, borderColor: colors.card },
                  ]}
                />
              </MapLibreGL.PointAnnotation>
            )}
          </MapLibreGL.MapView>
        ) : (
          <View style={[styles.map, styles.mapLoading]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </View>

      <View style={[styles.form, { padding: spacing(6), paddingBottom: insets.bottom + spacing(6) }]}>
        <Text style={[styles.hint, { color: colors.mutedForeground, fontSize: fontSize.sm, marginBottom: spacing(3) }]}>
          {coordinate ? "Tap the pin to save, or tap elsewhere on the map to move it" : "Search above or tap the map to drop a pin"}
        </Text>
        <TextField ref={nameInputRef} label="Name" placeholder="Home" value={name} onChangeText={setName} />

        <View style={styles.chipRow}>
          {QUICK_LABELS.map((chip) => (
            <Pressable
              key={chip.label}
              onPress={() => onQuickLabel(chip)}
              style={[
                styles.chip,
                {
                  borderColor: name === chip.label ? colors.primary : colors.border,
                  borderRadius: radius.full,
                  marginRight: spacing(2),
                  marginBottom: spacing(2),
                  paddingVertical: spacing(1.5),
                  paddingHorizontal: spacing(3),
                },
              ]}
            >
              <Text style={{ fontSize: fontSize.sm, color: colors.foreground }}>
                {chip.icon} {chip.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && <FormError message={error} />}

        <Button title="Save" onPress={onSave} disabled={!coordinate || !name.trim()} loading={isSaving} />
      </View>

      {/* Rendered as the last sibling (not nested inside mapContainer) with a high zIndex/elevation
          so it reliably paints above both the map and the form below it, instead of the two
          overlapping/interleaving that happened when this lived inside mapContainer. */}
      <View
        style={[styles.searchBar, { top: insets.top + spacing(3), paddingHorizontal: spacing(4) }]}
        pointerEvents="box-none"
      >
        <TextField
          placeholder="Search for a place"
          value={query}
          onChangeText={setQuery}
          style={shadow.sm}
          returnKeyType="search"
        />
        {isSearching && (
          <ActivityIndicator style={styles.searchSpinner} color={colors.mutedForeground} size="small" />
        )}
        {results.length > 0 && (
          <FlatList
            data={results}
            keyExtractor={(item, index) => `${item.lat},${item.lng},${index}`}
            style={[
              styles.results,
              shadow.sm,
              { backgroundColor: colors.card, borderRadius: radius.md, borderColor: colors.border },
            ]}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelectResult(item)}
                style={[
                  styles.resultRow,
                  { backgroundColor: colors.card, borderBottomColor: colors.border, padding: spacing(3) },
                ]}
              >
                <Text style={{ color: colors.foreground, fontSize: fontSize.sm }} numberOfLines={2}>
                  {item.displayName}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: -4 },
  chip: { borderWidth: 1 },
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapLoading: { justifyContent: "center", alignItems: "center" },
  searchBar: { position: "absolute", left: 0, right: 0, zIndex: 10, elevation: 10 },
  searchSpinner: { position: "absolute", right: 28, top: 14 },
  results: { maxHeight: 220, borderWidth: 1, marginTop: -8, elevation: 10 },
  resultRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  form: {},
  hint: { textAlign: "center" },
  pin: {
    width: 24,
    height: 24,
    borderWidth: 2,
  },
});
