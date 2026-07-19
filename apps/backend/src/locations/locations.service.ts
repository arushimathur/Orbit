import { Injectable, Logger } from "@nestjs/common";
import { CreateLocationPingDto, LocationPing, MemberLocation } from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toPublicUser } from "../common/public-user.mapper";
import { CirclesService } from "../circles/circles.service";
import { RealtimeService } from "../realtime/realtime.service";
import { PlacesService } from "../places/places.service";

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
    const publicPing = this.toLocationPing(ping);

    // A user's location is broadcast into every circle they belong to (a ping isn't
    // scoped to one circle — matches the mental model of "my location", not "my circle's location").
    const circleIds = await this.circlesService.listCircleIdsForUser(userId);
    for (const circleId of circleIds) {
      this.realtimeService.broadcastLocationUpdate(circleId, {
        circleId,
        user: toPublicUser(user),
        ping: publicPing,
      });
    }

    // Place arrival/departure evaluation is a downstream, best-effort feature -- a failure
    // here (DB hiccup, a place deleted mid-evaluation, etc.) must never turn an already-
    // persisted, already-broadcast ping into a failed request.
    try {
      await this.placesService.evaluateForPing(userId, publicPing, user.name);
    } catch (err) {
      this.logger.warn(
        `Failed to evaluate saved places for ping: ${err instanceof Error ? err.message : String(err)}`,
      );
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

    return members.map((member) => {
      const ping = latestByUserId.get(member.userId);
      return {
        user: toPublicUser(member.user),
        ping: ping ? this.toLocationPing(ping) : null,
      };
    });
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
