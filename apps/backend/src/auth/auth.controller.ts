import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ForgotPasswordDto,
  forgotPasswordDtoSchema,
  LoginDto,
  loginDtoSchema,
  RefreshDto,
  refreshDtoSchema,
  RegisterDto,
  registerDtoSchema,
  ResetPasswordDto,
  resetPasswordDtoSchema,
  UpdatePushTokenDto,
  updatePushTokenDtoSchema,
  UpdateProfileDto,
  updateProfileDtoSchema,
} from "@orbit/shared";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { toPublicUser } from "../common/public-user.mapper";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("register")
  register(@Body(new ZodValidationPipe(registerDtoSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginDtoSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body(new ZodValidationPipe(refreshDtoSchema)) dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body(new ZodValidationPipe(forgotPasswordDtoSchema)) dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body(new ZodValidationPipe(resetPasswordDtoSchema)) dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return toPublicUser(record);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileDtoSchema)) dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Patch("push-token")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updatePushTokenDtoSchema)) dto: UpdatePushTokenDto,
  ) {
    return this.authService.updatePushToken(user.id, dto.pushToken);
  }
}
