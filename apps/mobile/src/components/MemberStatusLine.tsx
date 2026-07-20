import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LocationPing, Notification } from "@orbit/shared";
import { useReverseGeocodedLabel } from "../hooks/useReverseGeocodedLabel";
import { useTheme } from "../theme/theme";
import { memberStatus } from "../utils/memberStatus";

export default function MemberStatusLine({
  ping,
  latestEvent,
}: {
  ping: LocationPing | null;
  latestEvent: Notification | undefined;
}) {
  const { colors, fontSize } = useTheme();
  const status = memberStatus(ping, latestEvent);
  const locationLabel = useReverseGeocodedLabel(
    status.needsLocationLookup ? ping?.lat : undefined,
    status.needsLocationLookup ? ping?.lng : undefined,
  );
  const headline = status.needsLocationLookup ? (locationLabel ?? "Locating…") : status.headline;
  const statusText = status.time ? `${headline} · ${status.time}` : headline;

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Ionicons name={status.icon} size={fontSize.sm} color={colors.mutedForeground} style={{ marginRight: 4 }} />
      <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm, flexShrink: 1 }} numberOfLines={1}>
        {statusText}
        {status.battery ? (
          <Text style={{ color: status.isLowBattery ? colors.destructive : colors.mutedForeground }}>
            {" "}
            · {status.battery}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}
