import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/auth/AuthContext";
import { CircleProvider } from "./src/circle/CircleContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { registerForPushNotifications } from "./src/notifications/registerForPushNotifications";

export default function App() {
  useEffect(() => {
    registerForPushNotifications().catch((err) => console.warn("Push registration failed:", err));
  }, []);

  return (
    <AuthProvider>
      <CircleProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </CircleProvider>
    </AuthProvider>
  );
}
