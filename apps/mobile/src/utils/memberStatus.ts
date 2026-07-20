import { LocationPing, Notification } from "@orbit/shared";
import { lastSeenLabel } from "./time";

// Notifications are returned newest-first (backend orders by createdAt desc), so the first
// event seen per actor is already their most recent arrival/departure.
export function latestEventsByActor(notifications: Notification[]): Record<string, Notification> {
  const result: Record<string, Notification> = {};
  for (const n of notifications) {
    if (n.actorUserId && !result[n.actorUserId]) {
      result[n.actorUserId] = n;
    }
  }
  return result;
}

export interface MemberStatus {
  icon: "home-outline" | "car-outline" | "location-outline" | "help-circle-outline";
  // A known saved-place name ("Home", "Office"); empty when we only have raw coordinates and the
  // caller should fill in a reverse-geocoded label instead (see `needsLocationLookup`).
  headline: string;
  time: string | null;
  battery: string | null;
  isLowBattery: boolean;
  needsLocationLookup: boolean;
}

const LOW_BATTERY_PCT = 20;

export function memberStatus(ping: LocationPing | null, latestEvent: Notification | undefined): MemberStatus {
  if (!ping) {
    return {
      icon: "help-circle-outline",
      headline: "No location yet",
      time: null,
      battery: null,
      isLowBattery: false,
      needsLocationLookup: false,
    };
  }

  const battery = ping.batteryPct !== null ? `${Math.round(ping.batteryPct)}%` : null;
  const isLowBattery = ping.batteryPct !== null && ping.batteryPct < LOW_BATTERY_PCT;
  const time = lastSeenLabel(ping.recordedAt);

  if (latestEvent?.type === "arrived") {
    return { icon: "home-outline", headline: latestEvent.placeName, time, battery, isLowBattery, needsLocationLookup: false };
  }
  // No confirmed "at a saved place" signal -- the caller resolves the actual spot via reverse
  // geocoding rather than showing a vague "on the way".
  return {
    icon: latestEvent?.type === "left" ? "car-outline" : "location-outline",
    headline: "",
    time,
    battery,
    isLowBattery,
    needsLocationLookup: true,
  };
}

export function dayBucketLabel(dateIso: string): string {
  const date = new Date(dateIso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export interface ActivitySection {
  title: string;
  data: Notification[];
}

// Notifications arrive pre-sorted newest-first, so contiguous same-day runs can be grouped
// in a single pass instead of a full re-sort/groupBy.
export function groupByDay(notifications: Notification[]): ActivitySection[] {
  const sections: ActivitySection[] = [];
  for (const n of notifications) {
    const title = dayBucketLabel(n.occurredAt);
    const last = sections[sections.length - 1];
    if (last && last.title === title) {
      last.data.push(n);
    } else {
      sections.push({ title, data: [n] });
    }
  }
  return sections;
}
