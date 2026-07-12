import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Circle, CircleMember, CreateCircleDto, JoinCircleDto } from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toPublicUser } from "../common/public-user.mapper";

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity

@Injectable()
export class CirclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCircleDto): Promise<Circle> {
    const circle = await this.prisma.circle.create({
      data: {
        name: dto.name,
        createdBy: userId,
        inviteCode: await this.generateUniqueInviteCode(),
        members: {
          create: { userId, role: "owner" },
        },
      },
    });

    return this.toCircle(circle);
  }

  async join(userId: string, dto: JoinCircleDto): Promise<Circle> {
    const circle = await this.prisma.circle.findUnique({ where: { inviteCode: dto.inviteCode } });
    if (!circle) {
      throw new NotFoundException("No circle found for that invite code");
    }

    await this.prisma.circleMember.upsert({
      where: { circleId_userId: { circleId: circle.id, userId } },
      update: {},
      create: { circleId: circle.id, userId, role: "member" },
    });

    return this.toCircle(circle);
  }

  async listMembers(circleId: string, requestingUserId: string): Promise<CircleMember[]> {
    await this.assertMembership(circleId, requestingUserId);

    const members = await this.prisma.circleMember.findMany({
      where: { circleId },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });

    return members.map((m) => ({
      circleId: m.circleId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      user: toPublicUser(m.user),
    }));
  }

  /** Throws if the user is not a member of the circle. Reused by locations endpoints and the realtime gateway. */
  async assertMembership(circleId: string, userId: string): Promise<void> {
    const membership = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException("You are not a member of this circle");
    }
  }

  async listCircleIdsForUser(userId: string): Promise<string[]> {
    const memberships = await this.prisma.circleMember.findMany({
      where: { userId },
      select: { circleId: true },
    });
    return memberships.map((m) => m.circleId);
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.randomInviteCode();
      const existing = await this.prisma.circle.findUnique({ where: { inviteCode: code } });
      if (!existing) return code;
    }
    throw new Error("Failed to generate a unique invite code");
  }

  private randomInviteCode(): string {
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)];
    }
    return code;
  }

  private toCircle(circle: { id: string; name: string; inviteCode: string; createdBy: string; createdAt: Date }): Circle {
    return {
      id: circle.id,
      name: circle.name,
      inviteCode: circle.inviteCode,
      createdBy: circle.createdBy,
      createdAt: circle.createdAt.toISOString(),
    };
  }
}
