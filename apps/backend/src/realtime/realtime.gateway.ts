import { Inject, Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { JoinCircleEvent, joinCircleEventSchema, LocationUpdateEvent, SOCKET_EVENTS } from "@orbit/shared";
import { ACCESS_JWT_SERVICE } from "../common/token.module";
import { JwtAccessPayload } from "../auth/jwt-payload.interface";
import { CirclesService } from "../circles/circles.service";

@WebSocketGateway({ cors: { origin: "*" } })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(ACCESS_JWT_SERVICE) private readonly accessJwt: JwtService,
    private readonly circlesService: CirclesService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.accessJwt.verifyAsync<JwtAccessPayload>(token);
      client.data.userId = payload.sub;
    } catch {
      this.logger.warn(`Socket ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.JOIN_CIRCLE)
  async handleJoinCircle(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    const parsed = joinCircleEventSchema.safeParse(body);
    if (!parsed.success) return;

    const { circleId }: JoinCircleEvent = parsed.data;
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    try {
      await this.circlesService.assertMembership(circleId, userId);
    } catch {
      this.logger.warn(`Socket ${client.id} tried to join circle ${circleId} without membership`);
      return;
    }
    await client.join(`circle:${circleId}`);
  }

  broadcastLocationUpdate(circleId: string, event: LocationUpdateEvent) {
    this.server.to(`circle:${circleId}`).emit(SOCKET_EVENTS.LOCATION_UPDATE, event);
  }
}
