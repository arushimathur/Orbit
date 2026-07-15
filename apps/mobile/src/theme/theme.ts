import { useColorScheme } from "react-native";
import { darkColors, lightColors } from "./colors";

export const spacing = (n: number) => n * 4;

export const radius = { sm: 6, md: 10, lg: 14, xl: 20, full: 999 };

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
};

function shadowFor(color: string) {
  return {
    sm: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
  } as const;
}

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = isDark ? darkColors : lightColors;

  return {
    isDark,
    colors,
    spacing,
    radius,
    fontSize,
    shadow: shadowFor(colors.shadowColor),
  };
}

export type Theme = ReturnType<typeof useTheme>;
