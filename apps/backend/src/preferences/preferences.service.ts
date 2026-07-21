import { Injectable } from "@nestjs/common";
import { MutedMember, NotificationPreferences, UpdateNotificationPreferencesDto } from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notifyArrivals: true,
  notifyLowBattery: true,
  notifyRunningLate: false,
  quietHoursStart: null,
  quietHoursEnd: null,
};

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string): Promise<NotificationPreferences> {
    const row = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!row) return DEFAULT_PREFERENCES;
    return {
      notifyArrivals: row.notifyArrivals,
      notifyLowBattery: row.notifyLowBattery,
      notifyRunningLate: row.notifyRunningLate,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
    };
  }

  async update(userId: string, dto: UpdateNotificationPreferencesDto): Promise<NotificationPreferences> {
    const current = await this.getForUser(userId);
    const next = { ...current, ...dto };
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: next,
      create: { userId, ...next },
    });
    return {
      notifyArrivals: row.notifyArrivals,
      notifyLowBattery: row.notifyLowBattery,
      notifyRunningLate: row.notifyRunningLate,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
    };
  }

  async listMuted(ownerId: string): Promise<MutedMember[]> {
    const rows = await this.prisma.mutedMember.findMany({ where: { ownerId } });
    return rows.map((r) => ({ userId: r.mutedUserId }));
  }

  async mute(ownerId: string, mutedUserId: string): Promise<void> {
    await this.prisma.mutedMember.upsert({
      where: { ownerId_mutedUserId: { ownerId, mutedUserId } },
      update: {},
      create: { ownerId, mutedUserId },
    });
  }

  async unmute(ownerId: string, mutedUserId: string): Promise<void> {
    await this.prisma.mutedMember.deleteMany({ where: { ownerId, mutedUserId } });
  }

  // Bulk lookups for NotificationsService's fan-out filtering -- one query per set instead
  // of N queries per recipient.
  async getPreferencesMap(userIds: string[]): Promise<Map<string, NotificationPreferences>> {
    const map = new Map<string, NotificationPreferences>();
    if (userIds.length === 0) return map;
    const rows = await this.prisma.notificationPreference.findMany({ where: { userId: { in: userIds } } });
    for (const row of rows) {
      map.set(row.userId, {
        notifyArrivals: row.notifyArrivals,
        notifyLowBattery: row.notifyLowBattery,
        notifyRunningLate: row.notifyRunningLate,
        quietHoursStart: row.quietHoursStart,
        quietHoursEnd: row.quietHoursEnd,
      });
    }
    return map;
  }

  async getMutedActorSets(ownerIds: string[]): Promise<Map<string, Set<string>>> {
    const map = new Map<string, Set<string>>();
    if (ownerIds.length === 0) return map;
    const rows = await this.prisma.mutedMember.findMany({ where: { ownerId: { in: ownerIds } } });
    for (const row of rows) {
      const set = map.get(row.ownerId) ?? new Set<string>();
      set.add(row.mutedUserId);
      map.set(row.ownerId, set);
    }
    return map;
  }
}
