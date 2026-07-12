import { Injectable } from "@nestjs/common";
import { CreateLocationPingDto, LocationPing, MemberLocation } from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toPublicUser } from "../common/public-user.mapper";
import { CirclesService } from "../circles/circles.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly realtimeGateway: RealtimeGateway,
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
      this.realtimeGateway.broadcastLocationUpdate(circleId, {
        circleId,
        user: toPublicUser(user),
        ping: publicPing,
      });
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
