import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { CircleProvider } from "./src/circle/CircleContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { registerForPushNotifications } from "./src/notifications/registerForPushNotifications";
import { useTheme } from "./src/theme/theme";

export default function App() {
  const { isDark } = useTheme();

  useEffect(() => {
    registerForPushNotifications()
      .then((token) => console.log("Push token:", token))
      .catch((err) => console.warn("Push registration failed:", err));
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CircleProvider>
          <StatusBar style={isDark ? "light" : "dark"} />
          <RootNavigator />
        </CircleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
