import React from "react";
import { ActivityIndicator, View } from "react-native";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import CircleSetupScreen from "../screens/CircleSetupScreen";
import MapScreen from "../screens/MapScreen";
import { useTheme } from "../theme/theme";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

export type MainStackParamList = {
  CircleSetup: undefined;
  Map: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

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
    <NavigationContainer theme={navigationTheme}>
      {!user ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </AuthStack.Navigator>
      ) : (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          {!circle ? (
            <MainStack.Screen name="CircleSetup" component={CircleSetupScreen} />
          ) : (
            <MainStack.Screen name="Map" component={MapScreen} />
          )}
        </MainStack.Navigator>
      )}
    </NavigationContainer>
  );
}
