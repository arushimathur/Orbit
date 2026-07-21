import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from "@nestjs/common";
import { SetNicknameDto, setNicknameDtoSchema } from "@orbit/shared";
import { NicknamesService } from "./nicknames.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("nicknames")
@UseGuards(JwtAuthGuard)
export class NicknamesController {
  constructor(private readonly nicknamesService: NicknamesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.nicknamesService.listForOwner(user.id);
  }

  @Put(":targetUserId")
  set(
    @CurrentUser() user: AuthenticatedUser,
    @Param("targetUserId") targetUserId: string,
    @Body(new ZodValidationPipe(setNicknameDtoSchema)) dto: SetNicknameDto,
  ) {
    return this.nicknamesService.set(user.id, targetUserId, dto.nickname);
  }

  @Delete(":targetUserId")
  @HttpCode(HttpStatus.NO_CONTENT)
  clear(@CurrentUser() user: AuthenticatedUser, @Param("targetUserId") targetUserId: string) {
    return this.nicknamesService.clear(user.id, targetUserId);
  }
}
