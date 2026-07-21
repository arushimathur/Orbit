import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { PauseSharingDto, pauseSharingDtoSchema } from "@orbit/shared";
import { SharingService } from "./sharing.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("sharing")
@UseGuards(JwtAuthGuard)
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Get("status")
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.sharingService.getStatus(user.id);
  }

  @Patch("pause")
  pause(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(pauseSharingDtoSchema)) dto: PauseSharingDto,
  ) {
    return this.sharingService.pause(user.id, dto.until);
  }

  @Patch("resume")
  resume(@CurrentUser() user: AuthenticatedUser) {
    return this.sharingService.resume(user.id);
  }
}
