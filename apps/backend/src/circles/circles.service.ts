import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Circle, CircleMember, CirclePreview, CreateCircleDto, JoinCircleDto, LocationPrecision } from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toPublicUser } from "../common/public-user.mapper";

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity
const MIN_DERIVED_CODE_LETTERS = 3;

@Injectable()
export class CirclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCircleDto): Promise<Circle> {
    const inviteCode = dto.inviteCode
      ? await this.claimInviteCode(dto.inviteCode)
      : await this.generateInviteCode(dto.name);

    const circle = await this.prisma.circle.create({
      data: {
        name: dto.name,
        createdBy: userId,
        inviteCode,
        members: {
          create: { userId, role: "owner" },
        },
      },
    });

    return this.toCircle(circle);
  }

  // GET /circles/suggest-code -- onboarding preview, called once for the name-derived code
  // and again (with `exclude`) each time the user taps "regenerate".
  async suggestInviteCode(name: string, exclude?: string): Promise<string> {
    const derived = this.deriveCodeFromName(name);
    if (derived && derived !== exclude && !(await this.codeTaken(derived))) {
      return derived;
    }
    return this.randomAvailableCode(exclude);
  }

  private async claimInviteCode(code: string): Promise<string> {
    if (await this.codeTaken(code)) {
      throw new ConflictException("That invite code was just taken -- try another");
    }
    return code;
  }

  private async generateInviteCode(name: string): Promise<string> {
    const derived = this.deriveCodeFromName(name);
    if (derived && !(await this.codeTaken(derived))) {
      return derived;
    }
    return this.randomAvailableCode();
  }

  private deriveCodeFromName(name: string): string | null {
    const firstWord = name.trim().split(/\s+/)[0] ?? "";
    const letters = firstWord.replace(/[^a-zA-Z]/g, "").toUpperCase();
    if (letters.length < MIN_DERIVED_CODE_LETTERS) return null;
    return letters.slice(0, 10);
  }

  private async codeTaken(code: string): Promise<boolean> {
    return (await this.prisma.circle.findUnique({ where: { inviteCode: code } })) !== null;
  }

  private async randomAvailableCode(exclude?: string): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.randomInviteCode();
      if (code === exclude) continue;
      if (!(await this.codeTaken(code))) return code;
    }
    throw new Error("Failed to generate a unique invite code");
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
      locationPrecision: m.locationPrecision,
      joinedAt: m.joinedAt.toISOString(),
      user: toPublicUser(m.user),
    }));
  }

  async setPrecision(circleId: string, userId: string, precision: LocationPrecision): Promise<void> {
    await this.assertMembership(circleId, userId);
    await this.prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId } },
      data: { locationPrecision: precision },
    });
  }

  // Unauthenticated preview shown before a deep-link join is committed -- same trust level
  // as knowing the invite code itself.
  async getPreview(inviteCode: string): Promise<CirclePreview> {
    const circle = await this.prisma.circle.findUnique({
      where: { inviteCode },
      include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" }, take: 3 } },
    });
    if (!circle) {
      throw new NotFoundException("No circle found for that invite code");
    }
    const memberCount = await this.prisma.circleMember.count({ where: { circleId: circle.id } });
    return {
      name: circle.name,
      memberCount,
      memberInitials: circle.members.map((m) => m.user.name.slice(0, 1).toUpperCase()),
    };
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

  // Every user, deduplicated, who shares at least one circle with `userId` -- excludes
  // `userId` itself. Used to fan out place arrival/departure notifications without
  // double-notifying someone who shares more than one circle with the actor.
  async listFellowMemberIds(userId: string): Promise<string[]> {
    const circleIds = await this.listCircleIdsForUser(userId);
    if (circleIds.length === 0) return [];

    const fellowMembers = await this.prisma.circleMember.findMany({
      where: { circleId: { in: circleIds }, userId: { not: userId } },
      select: { userId: true },
      distinct: ["userId"],
    });
    return fellowMembers.map((m) => m.userId);
  }

  async leave(circleId: string, userId: string): Promise<void> {
    await this.assertMembership(circleId, userId);
    await this.prisma.circleMember.delete({
      where: { circleId_userId: { circleId, userId } },
    });
  }

  async listForUser(userId: string): Promise<Circle[]> {
    const memberships = await this.prisma.circleMember.findMany({
      where: { userId },
      include: { circle: true },
      orderBy: { joinedAt: "asc" },
    });
    return memberships.map((m) => this.toCircle(m.circle));
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
