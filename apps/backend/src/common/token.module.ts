import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

export const ACCESS_JWT_SERVICE = "ACCESS_JWT_SERVICE";
export const REFRESH_JWT_SERVICE = "REFRESH_JWT_SERVICE";

// Two separately-configured JwtService instances (different secrets/lifetimes) shared
// by AuthService (signs both) and RealtimeGateway (verifies access tokens on socket connect).
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ACCESS_JWT_SERVICE,
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
          signOptions: { expiresIn: "15m" },
        }),
      inject: [ConfigService],
    },
    {
      provide: REFRESH_JWT_SERVICE,
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.getOrThrow<string>("JWT_REFRESH_SECRET"),
          signOptions: { expiresIn: "30d" },
        }),
      inject: [ConfigService],
    },
  ],
  exports: [ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE],
})
export class TokenModule {}
