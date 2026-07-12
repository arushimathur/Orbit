import { Body, Controller, Get, MessageEvent, Param, Post, Sse, UseGuards } from "@nestjs/common";
import { Observable, from, switchMap } from "rxjs";
import { CreateLocationPingDto, createLocationPingDtoSchema } from "@orbit/shared";
import { LocationsService } from "./locations.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { CirclesService } from "../circles/circles.service";
import { RealtimeService } from "../realtime/realtime.service";

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
  constructor(
    private readonly locationsService: LocationsService,
    private readonly circlesService: CirclesService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Get("latest")
  getLatest(@CurrentUser() user: AuthenticatedUser, @Param("circleId") circleId: string) {
    return this.locationsService.getLatestForCircle(circleId, user.id);
  }

  @Sse("events")
  streamEvents(@CurrentUser() user: AuthenticatedUser, @Param("circleId") circleId: string): Observable<MessageEvent> {
    return from(this.circlesService.assertMembership(circleId, user.id)).pipe(
      switchMap(() => this.realtimeService.streamForCircle(circleId)),
    );
  }
}
