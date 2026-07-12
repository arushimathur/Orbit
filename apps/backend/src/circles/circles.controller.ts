import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CreateCircleDto, createCircleDtoSchema, JoinCircleDto, joinCircleDtoSchema } from "@orbit/shared";
import { CirclesService } from "./circles.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("circles")
@UseGuards(JwtAuthGuard)
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

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
}
