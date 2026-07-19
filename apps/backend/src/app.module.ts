import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CirclesModule } from "./circles/circles.module";
import { LocationsModule } from "./locations/locations.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { PlacesModule } from "./places/places.module";
import { PushModule } from "./push/push.module";

@Module({
  imports: [
    // envFilePath is resolved relative to process.cwd() -- when run via
    // `npm run backend:dev` from the repo root, npm workspaces sets cwd to
    // apps/backend, so "../../.env" points back at the repo-root .env file
    // that `cp .env.example .env` creates.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "../../.env" }),
    PrismaModule,
    AuthModule,
    CirclesModule,
    LocationsModule,
    RealtimeModule,
    PlacesModule,
    PushModule,
  ],
})
export class AppModule {}
