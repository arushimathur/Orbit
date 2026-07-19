import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type Expo from "expo-server-sdk";
import type { ExpoPushMessage } from "expo-server-sdk";

// expo-server-sdk ships ESM-only; this backend compiles to CommonJS, and TypeScript
// rewrites a plain `import()` back into `require()` under that target, which still
// throws ERR_REQUIRE_ESM. Routing through `Function` forces Node's native dynamic
// import instead.
const importEsm = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<{ default: typeof Expo }>;

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
  private readonly accessToken?: string;
  private clientPromise: Promise<{ ExpoCtor: typeof Expo; expo: Expo }> | null = null;

  constructor(config: ConfigService) {
    this.accessToken = config.get<string>("EXPO_ACCESS_TOKEN");
  }

  private getClient(): Promise<{ ExpoCtor: typeof Expo; expo: Expo }> {
    if (!this.clientPromise) {
      this.clientPromise = importEsm("expo-server-sdk").then(({ default: ExpoCtor }) => ({
        ExpoCtor,
        expo: new ExpoCtor(this.accessToken ? { accessToken: this.accessToken } : undefined),
      }));
    }
    return this.clientPromise;
  }

  // Sends a push to each recipient with a valid token. Returns the ids of recipients whose
  // token Expo confirmed is dead (DeviceNotRegistered), so the caller can clear it. Never
  // throws -- a push-provider failure must never fail the request that triggered it.
  async sendToUsers(recipients: PushRecipient[], message: PushMessage): Promise<string[]> {
    const { ExpoCtor, expo } = await this.getClient();
    const tokenByUserId = new Map<string, string>();
    for (const recipient of recipients) {
      if (!recipient.pushToken) continue;
      if (!ExpoCtor.isExpoPushToken(recipient.pushToken)) {
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
    const chunks = expo.chunkPushNotifications(messages);
    let cursor = 0;
    for (const chunk of chunks) {
      const chunkUserIds = userIds.slice(cursor, cursor + chunk.length);
      cursor += chunk.length;
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
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
