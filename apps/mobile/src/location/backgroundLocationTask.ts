import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Battery from "expo-battery";
import { postLocation } from "../api/endpoints";

export const BACKGROUND_LOCATION_TASK = "fetchlocation-background-location";

// The OS-level watcher below reports at most every 20s / 15m moved. On top of that,
// while the user is essentially stationary we further throttle posts to once every
// 5 minutes to save battery/bandwidth -- this is the "adaptive interval" from the plan,
// implemented at the app layer since expo-location doesn't support changing the
// OS-level interval on the fly without restarting the background watcher (fragile).
const STATIONARY_SPEED_MPS = 0.5;
const STATIONARY_MIN_INTERVAL_MS = 5 * 60 * 1000;

let lastPostedAt = 0;

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("Background location task error:", error);
    return;
  }
  const { locations } = (data as { locations: Location.LocationObject[] }) ?? { locations: [] };
  const latest = locations[locations.length - 1];
  if (!latest) return;

  const speed = latest.coords.speed ?? 0;
  const now = Date.now();
  const isStationary = speed < STATIONARY_SPEED_MPS;
  if (isStationary && now - lastPostedAt < STATIONARY_MIN_INTERVAL_MS) {
    return;
  }
  lastPostedAt = now;

  const batteryLevel = await Battery.getBatteryLevelAsync().catch(() => null);

  try {
    await postLocation({
      lat: latest.coords.latitude,
      lng: latest.coords.longitude,
      accuracyM: latest.coords.accuracy,
      speedMps: speed,
      heading: latest.coords.heading,
      batteryPct: batteryLevel !== null && batteryLevel >= 0 ? Math.round(batteryLevel * 100) : null,
      recordedAt: new Date(latest.timestamp).toISOString(),
    });
  } catch (postError) {
    console.warn("Failed to post location ping:", postError);
  }
});

export type LocationTrackingResult = { started: true } | { started: false; reason: string };

export async function startBackgroundLocationTracking(): Promise<LocationTrackingResult> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    return { started: false, reason: `Foreground location permission not granted (status: ${foreground.status})` };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    return { started: false, reason: `Background location permission not granted (status: ${background.status})` };
  }

  // Post an immediate one-shot fix so the map shows something right away, rather than
  // waiting on the OS's background watcher to decide when to deliver its first callback
  // (which can be delayed well beyond `timeInterval` due to battery optimizations).
  try {
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const batteryLevel = await Battery.getBatteryLevelAsync().catch(() => null);
    await postLocation({
      lat: current.coords.latitude,
      lng: current.coords.longitude,
      accuracyM: current.coords.accuracy,
      speedMps: current.coords.speed,
      heading: current.coords.heading,
      batteryPct: batteryLevel !== null && batteryLevel >= 0 ? Math.round(batteryLevel * 100) : null,
      recordedAt: new Date(current.timestamp).toISOString(),
    });
    lastPostedAt = Date.now();
  } catch (err) {
    return {
      started: false,
      reason: `Failed to get/post initial location: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (!alreadyStarted) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 20000,
      distanceInterval: 15,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "FetchLocation is sharing your location",
        notificationBody: "Your circle can see your location while this is on.",
      },
    });
  }
  return { started: true };
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (alreadyStarted) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
