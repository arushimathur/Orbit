import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { TokenModule } from "../common/token.module";
import { CirclesModule } from "../circles/circles.module";

@Module({
  imports: [TokenModule, CirclesModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
