import { Injectable } from "@nestjs/common";
import { SharingStatus } from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SharingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string): Promise<SharingStatus> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { sharingPausedUntil: true },
    });
    return { sharingPausedUntil: user.sharingPausedUntil?.toISOString() ?? null };
  }

  async pause(userId: string, until: string): Promise<SharingStatus> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { sharingPausedUntil: new Date(until) },
      select: { sharingPausedUntil: true },
    });
    return { sharingPausedUntil: user.sharingPausedUntil?.toISOString() ?? null };
  }

  async resume(userId: string): Promise<SharingStatus> {
    await this.prisma.user.update({ where: { id: userId }, data: { sharingPausedUntil: null } });
    return { sharingPausedUntil: null };
  }
}
