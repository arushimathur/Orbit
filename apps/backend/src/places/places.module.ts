import { Module } from "@nestjs/common";
import { CirclePlacesController, PlacesController } from "./places.controller";
import { PlacesService } from "./places.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { CirclesModule } from "../circles/circles.module";
import { PushModule } from "../push/push.module";
import { PreferencesModule } from "../preferences/preferences.module";

@Module({
  imports: [CirclesModule, PushModule, PreferencesModule],
  controllers: [PlacesController, CirclePlacesController, NotificationsController],
  providers: [PlacesService, NotificationsService],
  exports: [PlacesService],
})
export class PlacesModule {}
