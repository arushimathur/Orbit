import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { createHash, randomInt, randomUUID } from "crypto";
import {
  AuthResponse,
  AuthTokens,
  ForgotPasswordDto,
  LoginDto,
  PublicUser,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from "@orbit/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toPublicUser } from "../common/public-user.mapper";
import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from "../common/token.module";
import { JwtRefreshPayload } from "./jwt-payload.interface";
import { MailService } from "../mail/mail.service";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @Inject(ACCESS_JWT_SERVICE) private readonly accessJwt: JwtService,
    @Inject(REFRESH_JWT_SERVICE) private readonly refreshJwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
    });

    return { user: toPublicUser(user), tokens: await this.issueTokens(user.id) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return { user: toPublicUser(user), tokens: await this.issueTokens(user.id) };
  }

  async refresh(dto: RefreshDto): Promise<AuthTokens> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.refreshJwt.verifyAsync<JwtRefreshPayload>(dto.refreshToken);
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    const tokenHash = this.hashToken(dto.refreshToken);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.tokenHash !== tokenHash) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(payload.sub);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return;
    }

    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        codeHash: this.hashToken(code),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      },
    });

    await this.mail.sendPasswordResetCode(user.email, code);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const invalid = () => new UnauthorizedException("Invalid or expired reset code");
    if (!user) {
      throw invalid();
    }

    const token = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!token || token.codeHash !== this.hashToken(dto.code)) {
      throw invalid();
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async updatePushToken(userId: string, pushToken: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { pushToken } });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, avatarUrl: dto.avatarUrl },
    });
    return toPublicUser(user);
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const jti = randomUUID();
    const accessToken = await this.accessJwt.signAsync({ sub: userId });
    const refreshToken = await this.refreshJwt.signAsync({ sub: userId, jti });

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
