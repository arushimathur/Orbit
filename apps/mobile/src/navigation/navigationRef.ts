import { createNavigationContainerRef } from "@react-navigation/native";
import { MainStackParamList } from "./RootNavigator";

// Lets code outside the navigator's component tree (e.g. App.tsx's notification-tap
// listener) trigger navigation.
export const navigationRef = createNavigationContainerRef<MainStackParamList>();
