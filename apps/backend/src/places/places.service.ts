import { Injectable, NotFoundException } from "@nestjs/common";
import { CirclePlace, CreatePlaceDto, LocationPing, PlaceSuggestion, SavedLocation } from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";
import { CirclesService } from "../circles/circles.service";
import { haversineDistanceMeters } from "./geo.util";

// Edge-triggered around a gap (not a single threshold) so battery hovering right at the
// line doesn't fire a fresh notification on every ping: cross below LOW to notify once,
// must recover above RESET before another low-battery notification can fire again.
const LOW_BATTERY_THRESHOLD = 15;
const LOW_BATTERY_RESET_THRESHOLD = 25;

// On-demand place-suggestion heuristic (not a background job -- no Redis/BullMQ in Phase
// 1). Buckets recent, roughly-stationary pings onto a ~111m grid and suggests the busiest
// cell not already covered by a saved place, if it's been visited on enough distinct days.
const SUGGESTION_LOOKBACK_DAYS = 14;
const SUGGESTION_MIN_DISTINCT_DAYS = 3;
const SUGGESTION_GRID_DECIMALS = 3; // ~111m
const SUGGESTION_RADIUS_M = 150;
const SUGGESTION_STATIONARY_SPEED_MPS = 0.5;

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly circlesService: CirclesService,
  ) {}

  async create(userId: string, dto: CreatePlaceDto): Promise<SavedLocation> {
    const place = await this.prisma.savedLocation.create({
      data: {
        userId,
        name: dto.name,
        kind: dto.kind,
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

  // GET /circles/:circleId/places -- every member's saved places (not just the caller's),
  // so "Home" can resolve to each person's own address in the circle-wide list.
  async listSharedForCircle(circleId: string, requestingUserId: string): Promise<CirclePlace[]> {
    await this.circlesService.assertMembership(circleId, requestingUserId);

    const members = await this.prisma.circleMember.findMany({ where: { circleId }, select: { userId: true } });
    const places = await this.prisma.savedLocation.findMany({
      where: { userId: { in: members.map((m) => m.userId) } },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return places.map((p) => ({ ...this.toSavedLocation(p), ownerName: p.user.name }));
  }

  async suggestPlaces(userId: string): Promise<PlaceSuggestion[]> {
    const since = new Date(Date.now() - SUGGESTION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const [pings, existingPlaces] = await Promise.all([
      this.prisma.locationPing.findMany({
        where: {
          userId,
          recordedAt: { gte: since },
          OR: [{ speedMps: null }, { speedMps: { lt: SUGGESTION_STATIONARY_SPEED_MPS } }],
        },
        select: { lat: true, lng: true, recordedAt: true },
      }),
      this.prisma.savedLocation.findMany({ where: { userId }, select: { lat: true, lng: true, radiusM: true } }),
    ]);

    const factor = 10 ** SUGGESTION_GRID_DECIMALS;
    const buckets = new Map<string, { latSum: number; lngSum: number; count: number; days: Set<string> }>();

    for (const ping of pings) {
      const nearExisting = existingPlaces.some(
        (p) => haversineDistanceMeters(ping.lat, ping.lng, p.lat, p.lng) <= p.radiusM,
      );
      if (nearExisting) continue;

      const key = `${Math.round(ping.lat * factor)},${Math.round(ping.lng * factor)}`;
      const bucket = buckets.get(key) ?? { latSum: 0, lngSum: 0, count: 0, days: new Set<string>() };
      bucket.latSum += ping.lat;
      bucket.lngSum += ping.lng;
      bucket.count += 1;
      bucket.days.add(ping.recordedAt.toISOString().slice(0, 10));
      buckets.set(key, bucket);
    }

    const best = [...buckets.values()]
      .filter((b) => b.days.size >= SUGGESTION_MIN_DISTINCT_DAYS)
      .sort((a, b) => b.days.size - a.days.size)[0];
    if (!best) return [];

    return [
      {
        lat: best.latSum / best.count,
        lng: best.lngSum / best.count,
        radiusM: SUGGESTION_RADIUS_M,
        visitedDays: best.days.size,
      },
    ];
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

  // Called from LocationsService.create() after every ping (skipped while sharing is
  // paused). Fires at most one notification per "low spell": `lowBatteryNotifiedAt` is
  // cleared once the battery recovers past the reset threshold, so a phone sitting at 12%
  // doesn't re-notify the circle on every subsequent ping.
  async evaluateLowBattery(userId: string, ping: LocationPing, actorName: string): Promise<void> {
    if (ping.batteryPct === null) return;

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { lowBatteryNotifiedAt: true },
    });

    if (ping.batteryPct > LOW_BATTERY_RESET_THRESHOLD) {
      if (user.lowBatteryNotifiedAt !== null) {
        await this.prisma.user.update({ where: { id: userId }, data: { lowBatteryNotifiedAt: null } });
      }
      return;
    }

    if (ping.batteryPct > LOW_BATTERY_THRESHOLD || user.lowBatteryNotifiedAt !== null) return;

    // Conditional update: only proceed if `lowBatteryNotifiedAt` is still null, the same
    // optimistic-concurrency guard used for geofence transitions above -- keeps two
    // near-simultaneous low-battery pings from both notifying the circle.
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, lowBatteryNotifiedAt: null },
      data: { lowBatteryNotifiedAt: new Date() },
    });
    if (count === 0) return;

    await this.notificationsService.notifyLowBattery(userId, actorName, ping.batteryPct, ping.recordedAt);
  }

  private toSavedLocation(place: {
    id: string;
    userId: string;
    name: string;
    kind: "home" | "work" | "custom";
    lat: number;
    lng: number;
    radiusM: number;
    createdAt: Date;
  }): SavedLocation {
    return {
      id: place.id,
      userId: place.userId,
      name: place.name,
      kind: place.kind,
      lat: place.lat,
      lng: place.lng,
      radiusM: place.radiusM,
      createdAt: place.createdAt.toISOString(),
    };
  }
}
