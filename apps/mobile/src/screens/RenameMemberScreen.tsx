import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import TextField from "../components/TextField";
import Button from "../components/Button";
import FormError from "../components/FormError";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme/theme";

type Props = NativeStackScreenProps<MainStackParamList, "RenameMember">;

const SUGGESTED_NICKNAMES = ["Papa", "Dad", "Boss", "Bhaiya"];

// Frame, page 6: "Rename for yourself" -- private to the viewer. Rahul stays "Rahul" for
// everyone else; this circle member's feed just shows "Papa".
export default function RenameMemberScreen({ navigation, route }: Props) {
  const { userId, currentName } = route.params;
  const { colors, spacing, radius, fontSize, shadow } = useTheme();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onSave = async () => {
    if (!nickname.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.setNickname(userId, { nickname: nickname.trim() });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View style={[styles.avatar, { backgroundColor: colors.muted, borderRadius: radius.full, marginBottom: spacing(4) }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: fontSize["2xl"], fontWeight: "700" }}>
          {currentName.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.name, { color: colors.foreground, fontSize: fontSize.xl, marginBottom: spacing(1) }]}>
        {currentName}
      </Text>
      <Text style={[styles.hint, { color: colors.mutedForeground, fontSize: fontSize.sm, marginBottom: spacing(6) }]}>
        their name in the circle
      </Text>

      <View style={{ width: "100%" }}>
        <TextField label="What you call them" placeholder="Papa" value={nickname} onChangeText={setNickname} />
        <View style={styles.chipRow}>
          {SUGGESTED_NICKNAMES.map((chip) => (
            <Pressable
              key={chip}
              onPress={() => setNickname(chip)}
              style={[
                styles.chip,
                { borderColor: colors.border, borderRadius: radius.full, marginRight: spacing(2), marginBottom: spacing(2), paddingVertical: spacing(1.5), paddingHorizontal: spacing(3) },
              ]}
            >
              <Text style={{ color: colors.foreground, fontSize: fontSize.sm }}>{chip}</Text>
            </Pressable>
          ))}
        </View>

        <View
          style={[styles.infoBox, shadow.sm, { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing(4), marginTop: spacing(3), marginBottom: spacing(5) }]}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm }}>
            Private to you. {currentName} still sees their own name — only your feed shows "{nickname || "…"}".
          </Text>
        </View>

        {error && <FormError message={error} />}
        <Button title="Save nickname" onPress={onSave} disabled={!nickname.trim()} loading={isSaving} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  name: { fontWeight: "700" },
  hint: {},
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  chip: { borderWidth: 1 },
  infoBox: {},
});
