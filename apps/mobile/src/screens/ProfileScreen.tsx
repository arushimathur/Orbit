import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import TextField from "../components/TextField";
import Button from "../components/Button";
import FormError from "../components/FormError";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCircle } from "../circle/CircleContext";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";

type Props = NativeStackScreenProps<MainStackParamList, "Profile">;

export default function ProfileScreen({ route }: Props) {
  const { user, setUserOverride } = useAuth();
  const { circle } = useCircle();
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [isEditing, setIsEditing] = useState(!!route.params?.editing);
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const cardStyle = [
    styles.card,
    shadow.sm,
    { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing(5), marginBottom: spacing(5) },
  ];

  const onSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.updateProfile({ name: name.trim() });
      setUserOverride(updated);
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View style={[styles.avatar, { backgroundColor: colors.primary, borderRadius: radius.full, marginBottom: spacing(5) }]}>
        <Text style={[styles.avatarText, { color: colors.primaryForeground, fontSize: fontSize["3xl"] }]}>
          {user.name.slice(0, 1).toUpperCase()}
        </Text>
      </View>

      <View style={cardStyle}>
        {isEditing ? (
          <>
            <TextField label="Name" value={name} onChangeText={setName} />
            {error && <FormError message={error} />}
            <Button title="Save" onPress={onSave} loading={isSaving} disabled={!name.trim()} />
          </>
        ) : (
          <>
            <View style={[styles.row, { marginBottom: spacing(4) }]}>
              <Ionicons name="person-outline" size={fontSize.lg} color={colors.mutedForeground} />
              <View style={{ marginLeft: spacing(3), flex: 1 }}>
                <Text style={[styles.label, { color: colors.mutedForeground, fontSize: fontSize.xs }]}>Name</Text>
                <Text style={[styles.value, { color: colors.foreground, fontSize: fontSize.base }]}>{user.name}</Text>
              </View>
              <Button title="Edit" variant="ghost" onPress={() => setIsEditing(true)} />
            </View>

            <View style={styles.row}>
              <Ionicons name="mail-outline" size={fontSize.lg} color={colors.mutedForeground} />
              <View style={{ marginLeft: spacing(3) }}>
                <Text style={[styles.label, { color: colors.mutedForeground, fontSize: fontSize.xs }]}>Email</Text>
                <Text style={[styles.value, { color: colors.foreground, fontSize: fontSize.base }]}>{user.email}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {circle && !isEditing && (
        <View style={cardStyle}>
          <View style={styles.row}>
            <Ionicons name="people-outline" size={fontSize.lg} color={colors.mutedForeground} />
            <View style={{ marginLeft: spacing(3) }}>
              <Text style={[styles.label, { color: colors.mutedForeground, fontSize: fontSize.xs }]}>Circle</Text>
              <Text style={[styles.value, { color: colors.foreground, fontSize: fontSize.base }]}>{circle.name}</Text>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center" },
  label: { fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { marginTop: 2 },
  avatar: { width: 72, height: 72, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  avatarText: { fontWeight: "700" },
});
