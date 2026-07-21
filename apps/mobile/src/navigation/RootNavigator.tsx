import React from "react";
import { ActivityIndicator, View } from "react-native";
import { DarkTheme, DefaultTheme, LinkingOptions, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PlaceKind } from "@orbit/shared";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import CircleSetupScreen from "../screens/CircleSetupScreen";
import LocationPermissionScreen from "../screens/LocationPermissionScreen";
import InviteFamilyScreen from "../screens/InviteFamilyScreen";
import JoinPreviewScreen from "../screens/JoinPreviewScreen";
import CirclesScreen from "../screens/CirclesScreen";
import HomeScreen from "../screens/HomeScreen";
import PersonScreen from "../screens/PersonScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import YouScreen from "../screens/YouScreen";
import SharingPrivacyScreen from "../screens/SharingPrivacyScreen";
import NotificationPreferencesScreen from "../screens/NotificationPreferencesScreen";
import HelpScreen from "../screens/HelpScreen";
import RenameMemberScreen from "../screens/RenameMemberScreen";
import PlacesScreen from "../screens/PlacesScreen";
import AddPlaceScreen from "../screens/AddPlaceScreen";
import { useTheme } from "../theme/theme";
import { navigationRef } from "./navigationRef";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

export type MainStackParamList = {
  CircleSetup: undefined;
  LocationPermission: undefined;
  InviteFamily: undefined;
  JoinPreview: { inviteCode: string };
  Home: undefined;
  Person: { userId: string };
  Circles: undefined;
  Notifications: undefined;
  Profile: { editing?: boolean } | undefined;
  You: undefined;
  SharingPrivacy: undefined;
  NotificationPreferences: undefined;
  Help: undefined;
  RenameMember: { userId: string; currentName: string };
  Places: undefined;
  AddPlace: { kind?: PlaceKind; prefillName?: string; prefillLat?: number; prefillLng?: number } | undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

// Custom-scheme deep link ("orbit://join/ABCD1234") for the pre-join preview screen -- only
// resolves while the authenticated MainStack is mounted (see JoinPreview route below); a
// cold, unauthenticated open of the link is a documented simplification, not universal/app
// links which would need a verified associated domain this environment doesn't have.
const linking: LinkingOptions<MainStackParamList> = {
  prefixes: ["orbit://"],
  config: {
    screens: {
      JoinPreview: "join/:inviteCode",
    },
  },
};

function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export default function RootNavigator() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { circle, isLoading: isCircleLoading } = useCircle();
  const { isDark, colors } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.foreground,
      border: colors.border,
      primary: colors.primary,
    },
  };

  if (isAuthLoading || (user && isCircleLoading)) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
      {!user ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </AuthStack.Navigator>
      ) : (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          {!circle ? (
            <>
              <MainStack.Screen name="CircleSetup" component={CircleSetupScreen} />
              <MainStack.Screen name="LocationPermission" component={LocationPermissionScreen} />
              <MainStack.Screen name="InviteFamily" component={InviteFamilyScreen} />
            </>
          ) : (
            <>
              <MainStack.Screen name="Home" component={HomeScreen} />
              <MainStack.Screen name="Person" component={PersonScreen} />
              <MainStack.Screen name="Notifications" component={NotificationsScreen} />
              <MainStack.Screen
                name="Circles"
                component={CirclesScreen}
                options={{ headerShown: true, title: "My Circles" }}
              />
              <MainStack.Screen name="CircleSetup" component={CircleSetupScreen} />
              <MainStack.Screen name="LocationPermission" component={LocationPermissionScreen} />
              <MainStack.Screen name="InviteFamily" component={InviteFamilyScreen} />
              <MainStack.Screen
                name="JoinPreview"
                component={JoinPreviewScreen}
                options={{ headerShown: true, title: "Join a circle" }}
              />
              <MainStack.Screen name="You" component={YouScreen} options={{ headerShown: true, title: "You" }} />
              <MainStack.Screen
                name="SharingPrivacy"
                component={SharingPrivacyScreen}
                options={{ headerShown: true, title: "Sharing & privacy" }}
              />
              <MainStack.Screen
                name="NotificationPreferences"
                component={NotificationPreferencesScreen}
                options={{ headerShown: true, title: "Notifications" }}
              />
              <MainStack.Screen name="Help" component={HelpScreen} options={{ headerShown: true, title: "Help & support" }} />
              <MainStack.Screen
                name="RenameMember"
                component={RenameMemberScreen}
                options={{ headerShown: true, title: "Rename for yourself" }}
              />
              <MainStack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ headerShown: true, title: "Profile" }}
              />
              <MainStack.Screen name="Places" component={PlacesScreen} options={{ headerShown: true, title: "Places" }} />
              <MainStack.Screen
                name="AddPlace"
                component={AddPlaceScreen}
                options={{ headerShown: true, title: "Add a place" }}
              />
            </>
          )}
        </MainStack.Navigator>
      )}
    </NavigationContainer>
  );
}
