import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { Notification } from "@orbit/shared";
import * as api from "../api/endpoints";
import { useCircle } from "../circle/CircleContext";
import { useCircleLocations } from "../hooks/useCircleLocations";
import { startBackgroundLocationTracking } from "../location/backgroundLocationTask";
import { MAP_STYLE_URL } from "../config";
import { MainStackParamList } from "../navigation/RootNavigator";
import BottomTabBar from "../components/BottomTabBar";
import MemberStatusLine from "../components/MemberStatusLine";
import { useTheme } from "../theme/theme";
import { latestEventsByActor } from "../utils/memberStatus";

export default function MapScreen() {
  const { circle } = useCircle();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const memberLocations = useCircleLocations(circle?.id);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      api
        .listNotifications()
        .then((result) => {
          if (isMounted) setNotifications(result);
        })
        .catch(() => undefined);
      return () => {
        isMounted = false;
      };
    }, []),
  );

  useEffect(() => {
    startBackgroundLocationTracking()
      .then((result) => {
        if (!result.started) {
          Alert.alert("Location tracking did not start", result.reason);
        }
      })
      .catch((err) => {
        Alert.alert("Location tracking error", err instanceof Error ? err.message : String(err));
      });
  }, []);

  const members = Object.values(memberLocations).sort((a, b) => a.user.name.localeCompare(b.user.name));
  const withPing = members.filter((m) => m.ping);
  const latestByActor = latestEventsByActor(notifications);

  if (!circle) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          shadow.sm,
          { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + spacing(3) },
        ]}
      >
        <Text style={[styles.circleName, { color: colors.foreground, fontSize: fontSize.lg }]}>
          {circle.name} · All members
        </Text>
      </View>
      <MapLibreGL.MapView style={styles.map} mapStyle={MAP_STYLE_URL}>
        <MapLibreGL.Camera
          zoomLevel={withPing.length ? 12 : 2}
          centerCoordinate={
            withPing[0] ? [withPing[0].ping!.lng, withPing[0].ping!.lat] : [0, 0]
          }
        />
        {withPing.map(({ user, ping }) => (
          <MapLibreGL.PointAnnotation
            key={user.id}
            id={user.id}
            coordinate={[ping!.lng, ping!.lat]}
            onSelected={() => navigation.navigate("Person", { userId: user.id })}
          >
            <View
              style={[
                styles.pin,
                shadow.sm,
                { backgroundColor: colors.primary, borderRadius: radius.full, borderColor: colors.card },
              ]}
            >
              <Text style={[styles.pinText, { color: colors.primaryForeground }]}>
                {user.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          </MapLibreGL.PointAnnotation>
        ))}
      </MapLibreGL.MapView>

      <FlatList
        style={[styles.list, { backgroundColor: colors.card, borderTopColor: colors.border }]}
        data={members}
        keyExtractor={(m) => m.user.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate("Person", { userId: item.user.id })}
            style={[styles.row, { paddingHorizontal: spacing(4), paddingVertical: spacing(3) }]}
          >
            <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.base }]}>
              {item.user.name}
            </Text>
            <MemberStatusLine ping={item.ping} latestEvent={latestByActor[item.user.id]} />
          </Pressable>
        )}
      />

      <BottomTabBar active="map" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  circleName: { fontWeight: "700" },
  map: { flex: 3 },
  pin: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  pinText: { fontWeight: "700" },
  list: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "600" },
});
