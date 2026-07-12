import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import {
  LoginDto,
  loginDtoSchema,
  RefreshDto,
  refreshDtoSchema,
  RegisterDto,
  registerDtoSchema,
} from "@fetchlocation/shared";
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

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return toPublicUser(record);
  }
}
