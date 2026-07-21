import { Injectable, Logger } from "@nestjs/common";
import { Notification, NotificationPreferences, PlaceEventType } from "@orbit/shared";
import { SavedLocation } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CirclesService } from "../circles/circles.service";
import { PushService } from "../push/push.service";
import { PreferencesService } from "../preferences/preferences.service";

interface NotifyPlaceEventInput {
  actorUserId: string;
  actorName: string;
  place: SavedLocation;
  type: PlaceEventType;
  occurredAt: string;
}

interface NotifyInput {
  actorUserId: string;
  actorName: string;
  type: PlaceEventType;
  placeId: string | null;
  placeName: string;
  occurredAt: string;
  toggle: "notifyArrivals" | "notifyLowBattery";
  pushBody: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly pushService: PushService,
    private readonly preferencesService: PreferencesService,
  ) {}

  async notifyPlaceEvent({ actorUserId, actorName, place, type, occurredAt }: NotifyPlaceEventInput): Promise<void> {
    const verb = type === "arrived" ? "arrived at" : "left";
    await this.notify({
      actorUserId,
      actorName,
      type,
      placeId: place.id,
      placeName: place.name,
      occurredAt,
      toggle: "notifyArrivals",
      pushBody: `${actorName} ${verb} ${place.name}`,
    });
  }

  async notifyLowBattery(
    actorUserId: string,
    actorName: string,
    batteryPct: number,
    occurredAt: string,
  ): Promise<void> {
    await this.notify({
      actorUserId,
      actorName,
      type: "low_battery",
      placeId: null,
      placeName: "",
      occurredAt,
      toggle: "notifyLowBattery",
      pushBody: `${actorName}'s battery is low (${Math.round(batteryPct)}%)`,
    });
  }

  // Shared fan-out for both place events and low-battery alerts: resolve recipients,
  // filter by per-recipient mute + notification-preference toggle, write the in-app rows
  // (source of truth, must succeed even if push fails below), then push everyone in that
  // filtered set who isn't currently in their own quiet hours.
  private async notify({ actorUserId, actorName, type, placeId, placeName, occurredAt, toggle, pushBody }: NotifyInput): Promise<void> {
    const allRecipientIds = await this.circlesService.listFellowMemberIds(actorUserId);
    if (allRecipientIds.length === 0) return;

    const [prefsMap, mutedMap] = await Promise.all([
      this.preferencesService.getPreferencesMap(allRecipientIds),
      this.preferencesService.getMutedActorSets(allRecipientIds),
    ]);

    const recipientIds = allRecipientIds.filter((id) => {
      if (mutedMap.get(id)?.has(actorUserId)) return false;
      const prefs = prefsMap.get(id);
      return prefs ? prefs[toggle] : true; // no row yet -> defaults, both toggles default on
    });
    if (recipientIds.length === 0) return;

    await this.prisma.placeEvent.createMany({
      data: recipientIds.map((recipientUserId) => ({
        recipientUserId,
        actorUserId,
        actorName,
        placeId,
        placeName,
        type,
        occurredAt: new Date(occurredAt),
      })),
    });

    const pushableIds = recipientIds.filter((id) => !this.isQuietHours(prefsMap.get(id)));
    if (pushableIds.length === 0) return;

    try {
      const recipients = await this.prisma.user.findMany({
        where: { id: { in: pushableIds } },
        select: { id: true, pushToken: true },
      });
      const deadTokenUserIds = await this.pushService.sendToUsers(recipients, { title: "Orbit", body: pushBody });
      if (deadTokenUserIds.length > 0) {
        await this.prisma.user.updateMany({
          where: { id: { in: deadTokenUserIds } },
          data: { pushToken: null },
        });
      }
    } catch (err) {
      // A push-provider failure must never fail the location-ping request that triggered it.
      this.logger.warn(`Failed to send push notifications: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Quiet hours are plain "HH:mm" compared against server UTC time (no per-user timezone
  // stored yet) -- suppresses push only, the in-app row above is always written.
  private isQuietHours(prefs: NotificationPreferences | undefined): boolean {
    if (!prefs?.quietHoursStart || !prefs.quietHoursEnd) return false;
    const now = new Date();
    const hhmm = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
    const { quietHoursStart: start, quietHoursEnd: end } = prefs;
    return start <= end ? hhmm >= start && hhmm < end : hhmm >= start || hhmm < end;
  }

  async listForUser(userId: string): Promise<Notification[]> {
    const events = await this.prisma.placeEvent.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: "desc" },
    });
    return events.map((e) => ({
      id: e.id,
      type: e.type,
      placeName: e.placeName,
      actorUserId: e.actorUserId,
      actorName: e.actorName,
      occurredAt: e.occurredAt.toISOString(),
      readAt: e.readAt ? e.readAt.toISOString() : null,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.placeEvent.updateMany({
      where: { recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
