import { Injectable, NotFoundException } from "@nestjs/common";
import { CreatePlaceDto, LocationPing, SavedLocation } from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";
import { haversineDistanceMeters } from "./geo.util";

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreatePlaceDto): Promise<SavedLocation> {
    const place = await this.prisma.savedLocation.create({
      data: {
        userId,
        name: dto.name,
        lat: dto.lat,
        lng: dto.lng,
        radiusM: dto.radiusM,
      },
    });
    return this.toSavedLocation(place);
  }

  async listForUser(userId: string): Promise<SavedLocation[]> {
    const places = await this.prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return places.map((p) => this.toSavedLocation(p));
  }

  async delete(userId: string, id: string): Promise<void> {
    const place = await this.prisma.savedLocation.findFirst({ where: { id, userId } });
    if (!place) {
      throw new NotFoundException("Saved location not found");
    }
    await this.prisma.savedLocation.delete({ where: { id } });
  }

  // Called from LocationsService.create() after every ping. Checks the actor's saved places
  // for an enter/exit transition and, if one occurred, fans out a notification. The very
  // first ping evaluated for a place (isInside === null) only records a baseline state --
  // otherwise adding a place while already standing in/near it would fire a spurious alert.
  async evaluateForPing(userId: string, ping: LocationPing, actorName: string): Promise<void> {
    const places = await this.prisma.savedLocation.findMany({ where: { userId } });
    if (places.length === 0) return;

    for (const place of places) {
      const distanceM = haversineDistanceMeters(ping.lat, ping.lng, place.lat, place.lng);
      const isInsideNow = distanceM <= place.radiusM;
      if (isInsideNow === place.isInside) continue;

      // Conditional update: only proceed if this row's isInside still matches what we just
      // read. If another concurrent evaluation (or a delete) already changed/removed the row,
      // `count` comes back 0 and we skip -- this is what keeps two near-simultaneous pings for
      // the same user from both detecting the same transition and double-notifying the circle.
      const { count } = await this.prisma.savedLocation.updateMany({
        where: { id: place.id, isInside: place.isInside },
        data: { isInside: isInsideNow },
      });
      if (count === 0) continue;

      // The first ping evaluated for a place only establishes the baseline -- no notification.
      if (place.isInside === null) continue;

      await this.notificationsService.notifyPlaceEvent({
        actorUserId: userId,
        actorName,
        place,
        type: isInsideNow ? "arrived" : "left",
        occurredAt: ping.recordedAt,
      });
    }
  }

  private toSavedLocation(place: {
    id: string;
    userId: string;
    name: string;
    lat: number;
    lng: number;
    radiusM: number;
    createdAt: Date;
  }): SavedLocation {
    return {
      id: place.id,
      userId: place.userId,
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      radiusM: place.radiusM,
      createdAt: place.createdAt.toISOString(),
    };
  }
}
