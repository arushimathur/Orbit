import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { CircleProvider } from "./src/circle/CircleContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import { registerForPushNotifications } from "./src/notifications/registerForPushNotifications";
import * as api from "./src/api/endpoints";
import { useTheme } from "./src/theme/theme";

function PushNotificationSync() {
  const { user } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    registerForPushNotifications()
      .then(setPushToken)
      .catch((err) => console.warn("Push registration failed:", err));
  }, []);

  useEffect(() => {
    if (!user || !pushToken) return;
    api.updatePushToken(pushToken).catch((err) => console.warn("Failed to register push token:", err));
  }, [user, pushToken]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      // "Notifications" only exists on the authenticated stack -- if the user is logged out
      // (e.g. a stale token wasn't cleared), there's nowhere valid to navigate to.
      if (user && navigationRef.isReady()) {
        navigationRef.navigate("Notifications");
      }
    });
    return () => subscription.remove();
  }, [user]);

  return null;
}

export default function App() {
  const { isDark } = useTheme();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CircleProvider>
          <StatusBar style={isDark ? "light" : "dark"} />
          <PushNotificationSync />
          <RootNavigator />
        </CircleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
