import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Expo, { ExpoPushMessage } from "expo-server-sdk";

interface PushRecipient {
  id: string;
  pushToken: string | null;
}

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo: Expo;

  constructor(config: ConfigService) {
    const accessToken = config.get<string>("EXPO_ACCESS_TOKEN");
    this.expo = new Expo(accessToken ? { accessToken } : undefined);
  }

  // Sends a push to each recipient with a valid token. Returns the ids of recipients whose
  // token Expo confirmed is dead (DeviceNotRegistered), so the caller can clear it. Never
  // throws -- a push-provider failure must never fail the request that triggered it.
  async sendToUsers(recipients: PushRecipient[], message: PushMessage): Promise<string[]> {
    const tokenByUserId = new Map<string, string>();
    for (const recipient of recipients) {
      if (!recipient.pushToken) continue;
      if (!Expo.isExpoPushToken(recipient.pushToken)) {
        this.logger.warn(`Skipping invalid Expo push token for user ${recipient.id}`);
        continue;
      }
      tokenByUserId.set(recipient.id, recipient.pushToken);
    }

    if (tokenByUserId.size === 0) return [];

    const userIds = [...tokenByUserId.keys()];
    const messages: ExpoPushMessage[] = userIds.map((userId) => ({
      to: tokenByUserId.get(userId)!,
      title: message.title,
      body: message.body,
      data: message.data,
    }));

    const deadTokenUserIds: string[] = [];
    const chunks = this.expo.chunkPushNotifications(messages);
    let cursor = 0;
    for (const chunk of chunks) {
      const chunkUserIds = userIds.slice(cursor, cursor + chunk.length);
      cursor += chunk.length;
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, i) => {
          if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
            deadTokenUserIds.push(chunkUserIds[i]);
          }
        });
      } catch (err) {
        this.logger.warn(
          `Failed to send a push notification chunk: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return deadTokenUserIds;
  }
}
