import { Injectable, Logger } from "@nestjs/common";
import { Notification, PlaceEventType } from "@orbit/shared";
import { SavedLocation } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CirclesService } from "../circles/circles.service";
import { PushService } from "../push/push.service";

interface NotifyPlaceEventInput {
  actorUserId: string;
  actorName: string;
  place: SavedLocation;
  type: PlaceEventType;
  occurredAt: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly pushService: PushService,
  ) {}

  async notifyPlaceEvent({ actorUserId, actorName, place, type, occurredAt }: NotifyPlaceEventInput): Promise<void> {
    const recipientIds = await this.circlesService.listFellowMemberIds(actorUserId);
    if (recipientIds.length === 0) return;

    // The notification row is the source of truth for the in-app list and must be written
    // even if the push send below fails.
    await this.prisma.placeEvent.createMany({
      data: recipientIds.map((recipientUserId) => ({
        recipientUserId,
        actorUserId,
        actorName,
        placeId: place.id,
        placeName: place.name,
        type,
        occurredAt: new Date(occurredAt),
      })),
    });

    try {
      const recipients = await this.prisma.user.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, pushToken: true },
      });
      const verb = type === "arrived" ? "arrived at" : "left";
      const deadTokenUserIds = await this.pushService.sendToUsers(recipients, {
        title: "Orbit",
        body: `${actorName} ${verb} ${place.name}`,
      });
      if (deadTokenUserIds.length > 0) {
        await this.prisma.user.updateMany({
          where: { id: { in: deadTokenUserIds } },
          data: { pushToken: null },
        });
      }
    } catch (err) {
      // A push-provider failure must never fail the location-ping request that triggered it.
      this.logger.warn(
        `Failed to send place event push notifications: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
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
