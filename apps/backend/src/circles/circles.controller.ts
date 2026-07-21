import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  CreateCircleDto,
  createCircleDtoSchema,
  JoinCircleDto,
  joinCircleDtoSchema,
  SetPrecisionDto,
  setPrecisionDtoSchema,
} from "@orbit/shared";
import { CirclesService } from "./circles.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("circles")
@UseGuards(JwtAuthGuard)
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  @Get("mine")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.circlesService.listForUser(user.id);
  }

  @Get("suggest-code")
  suggestCode(@Query("name") name: string, @Query("exclude") exclude?: string) {
    return this.circlesService.suggestInviteCode(name ?? "", exclude).then((code) => ({ code }));
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createCircleDtoSchema)) dto: CreateCircleDto) {
    return this.circlesService.create(user.id, dto);
  }

  @Post("join")
  join(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(joinCircleDtoSchema)) dto: JoinCircleDto) {
    return this.circlesService.join(user.id, dto);
  }

  @Get(":circleId/members")
  listMembers(@CurrentUser() user: AuthenticatedUser, @Param("circleId") circleId: string) {
    return this.circlesService.listMembers(circleId, user.id);
  }

  @Patch(":circleId/precision")
  @HttpCode(HttpStatus.NO_CONTENT)
  setPrecision(
    @CurrentUser() user: AuthenticatedUser,
    @Param("circleId") circleId: string,
    @Body(new ZodValidationPipe(setPrecisionDtoSchema)) dto: SetPrecisionDto,
  ) {
    return this.circlesService.setPrecision(circleId, user.id, dto.precision);
  }

  @Delete(":circleId/members/me")
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUser() user: AuthenticatedUser, @Param("circleId") circleId: string) {
    return this.circlesService.leave(circleId, user.id);
  }
}

// Unauthenticated on purpose: shown before a deep-link join is committed. Same trust level
// as knowing the invite code itself (see CirclesService.getPreview).
@Controller("circles/preview")
export class CirclePreviewController {
  constructor(private readonly circlesService: CirclesService) {}

  @Get(":inviteCode")
  preview(@Param("inviteCode") inviteCode: string) {
    return this.circlesService.getPreview(inviteCode);
  }
}
