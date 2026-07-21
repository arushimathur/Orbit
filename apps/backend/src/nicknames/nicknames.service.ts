import { Injectable } from "@nestjs/common";
import { Nickname } from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NicknamesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForOwner(ownerId: string): Promise<Nickname[]> {
    const rows = await this.prisma.nickname.findMany({ where: { ownerId } });
    return rows.map((r) => ({ targetUserId: r.targetUserId, nickname: r.nickname }));
  }

  async set(ownerId: string, targetUserId: string, nickname: string): Promise<Nickname> {
    await this.prisma.nickname.upsert({
      where: { ownerId_targetUserId: { ownerId, targetUserId } },
      update: { nickname },
      create: { ownerId, targetUserId, nickname },
    });
    return { targetUserId, nickname };
  }

  async clear(ownerId: string, targetUserId: string): Promise<void> {
    await this.prisma.nickname.deleteMany({ where: { ownerId, targetUserId } });
  }
}
