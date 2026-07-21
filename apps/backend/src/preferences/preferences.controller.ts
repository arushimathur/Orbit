import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Put, UseGuards } from "@nestjs/common";
import { UpdateNotificationPreferencesDto, updateNotificationPreferencesDtoSchema } from "@orbit/shared";
import { PreferencesService } from "./preferences.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("preferences")
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.getForUser(user.id);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateNotificationPreferencesDtoSchema)) dto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferencesService.update(user.id, dto);
  }

  @Get("muted")
  listMuted(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.listMuted(user.id);
  }

  @Put("mute/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  mute(@CurrentUser() user: AuthenticatedUser, @Param("userId") userId: string) {
    return this.preferencesService.mute(user.id, userId);
  }

  @Delete("mute/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  unmute(@CurrentUser() user: AuthenticatedUser, @Param("userId") userId: string) {
    return this.preferencesService.unmute(user.id, userId);
  }
}
