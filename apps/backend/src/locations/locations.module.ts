import { Module } from "@nestjs/common";
import { CircleLocationsController, LocationsController } from "./locations.controller";
import { LocationsService } from "./locations.service";
import { CirclesModule } from "../circles/circles.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { PlacesModule } from "../places/places.module";

@Module({
  imports: [CirclesModule, RealtimeModule, PlacesModule],
  controllers: [LocationsController, CircleLocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
