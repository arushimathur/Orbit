import { Injectable, Logger } from "@nestjs/common";
import { CreateLocationPingDto, LocationPing, LocationPrecision, MemberLocation } from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toPublicUser } from "../common/public-user.mapper";
import { CirclesService } from "../circles/circles.service";
import { RealtimeService } from "../realtime/realtime.service";
import { PlacesService } from "../places/places.service";
import { coarsenCoordinate } from "./precision.util";

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly realtimeService: RealtimeService,
    private readonly placesService: PlacesService,
  ) {}

  async create(userId: string, dto: CreateLocationPingDto): Promise<LocationPing> {
    const ping = await this.prisma.locationPing.create({
      data: {
        userId,
        lat: dto.lat,
        lng: dto.lng,
        accuracyM: dto.accuracyM ?? null,
        speedMps: dto.speedMps ?? null,
        heading: dto.heading ?? null,
        batteryPct: dto.batteryPct ?? null,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    // The response to the poster is always their own exact ping -- pause/precision only
    // affect what *other* circle members are shown, never what you see of yourself.
    const publicPing = this.toLocationPing(ping);
    const isPaused = !!user.sharingPausedUntil && user.sharingPausedUntil > new Date();
    const pausedUntilIso = isPaused ? user.sharingPausedUntil!.toISOString() : null;

    // A user's location is broadcast into every circle they belong to (a ping isn't scoped
    // to one circle — matches the mental model of "my location", not "my circle's
    // location"), coarsened per that circle's own precision setting for this member.
    const memberships = await this.prisma.circleMember.findMany({
      where: { userId },
      select: { circleId: true, locationPrecision: true },
    });
    for (const membership of memberships) {
      this.realtimeService.broadcastLocationUpdate(membership.circleId, {
        circleId: membership.circleId,
        user: toPublicUser(user),
        ping: isPaused ? null : this.applyPrecision(publicPing, membership.locationPrecision),
        sharingPausedUntil: pausedUntilIso,
      });
    }

    // Place-transition and low-battery evaluation are downstream, best-effort features --
    // a failure here (DB hiccup, a place deleted mid-evaluation, etc.) must never turn an
    // already-persisted, already-broadcast ping into a failed request. Both are skipped
    // while paused: they're location-derived reveals just like the live position, and on
    // resume the next ping simply re-baselines instead of firing a spurious transition for
    // whatever happened while paused.
    if (!isPaused) {
      try {
        await this.placesService.evaluateForPing(userId, publicPing, user.name);
      } catch (err) {
        this.logger.warn(
          `Failed to evaluate saved places for ping: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      try {
        await this.placesService.evaluateLowBattery(userId, publicPing, user.name);
      } catch (err) {
        this.logger.warn(
          `Failed to evaluate low battery for ping: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return publicPing;
  }

  async getLatestForCircle(circleId: string, requestingUserId: string): Promise<MemberLocation[]> {
    await this.circlesService.assertMembership(circleId, requestingUserId);

    const members = await this.prisma.circleMember.findMany({
      where: { circleId },
      include: { user: true },
    });

    const memberIds = members.map((m) => m.userId);
    const latestPings = await this.prisma.locationPing.findMany({
      where: { userId: { in: memberIds } },
      distinct: ["userId"],
      orderBy: { recordedAt: "desc" },
    });
    const latestByUserId = new Map(latestPings.map((p) => [p.userId, p]));

    const now = new Date();
    return members.map((member) => {
      const isPaused = !!member.user.sharingPausedUntil && member.user.sharingPausedUntil > now;
      const ping = latestByUserId.get(member.userId);
      return {
        user: toPublicUser(member.user),
        ping: isPaused || !ping ? null : this.applyPrecision(this.toLocationPing(ping), member.locationPrecision),
        sharingPausedUntil: isPaused ? member.user.sharingPausedUntil!.toISOString() : null,
      };
    });
  }

  private applyPrecision(ping: LocationPing, precision: LocationPrecision): LocationPing {
    if (precision !== "city") return ping;
    return { ...ping, lat: coarsenCoordinate(ping.lat, precision), lng: coarsenCoordinate(ping.lng, precision) };
  }

  private toLocationPing(ping: {
    id: string;
    userId: string;
    lat: number;
    lng: number;
    accuracyM: number | null;
    speedMps: number | null;
    heading: number | null;
    batteryPct: number | null;
    recordedAt: Date;
  }): LocationPing {
    return {
      id: ping.id,
      userId: ping.userId,
      lat: ping.lat,
      lng: ping.lng,
      accuracyM: ping.accuracyM,
      speedMps: ping.speedMps,
      heading: ping.heading,
      batteryPct: ping.batteryPct,
      recordedAt: ping.recordedAt.toISOString(),
    };
  }
}
