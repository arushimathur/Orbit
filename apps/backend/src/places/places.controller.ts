import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { CreatePlaceDto, createPlaceDtoSchema } from "@orbit/shared";
import { PlacesService } from "./places.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("places")
@UseGuards(JwtAuthGuard)
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPlaceDtoSchema)) dto: CreatePlaceDto,
  ) {
    return this.placesService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.placesService.listForUser(user.id);
  }

  @Get("suggestions")
  suggestions(@CurrentUser() user: AuthenticatedUser) {
    return this.placesService.suggestPlaces(user.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.placesService.delete(user.id, id);
  }
}

@Controller("circles/:circleId/places")
@UseGuards(JwtAuthGuard)
export class CirclePlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param("circleId") circleId: string) {
    return this.placesService.listSharedForCircle(circleId, user.id);
  }
}
