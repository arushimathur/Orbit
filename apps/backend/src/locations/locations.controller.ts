import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CreateLocationPingDto, createLocationPingDtoSchema } from "@fetchlocation/shared";
import { LocationsService } from "./locations.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("locations")
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createLocationPingDtoSchema)) dto: CreateLocationPingDto,
  ) {
    return this.locationsService.create(user.id, dto);
  }
}

@Controller("circles/:circleId/locations")
@UseGuards(JwtAuthGuard)
export class CircleLocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get("latest")
  getLatest(@CurrentUser() user: AuthenticatedUser, @Param("circleId") circleId: string) {
    return this.locationsService.getLatestForCircle(circleId, user.id);
  }
}
