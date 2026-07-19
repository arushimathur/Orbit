import { Module } from "@nestjs/common";
import { PlacesController } from "./places.controller";
import { PlacesService } from "./places.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { CirclesModule } from "../circles/circles.module";
import { PushModule } from "../push/push.module";

@Module({
  imports: [CirclesModule, PushModule],
  controllers: [PlacesController, NotificationsController],
  providers: [PlacesService, NotificationsService],
  exports: [PlacesService],
})
export class PlacesModule {}
