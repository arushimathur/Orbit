import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { createHash, randomUUID } from "crypto";
import { AuthResponse, AuthTokens, LoginDto, RefreshDto, RegisterDto } from "@fetchlocation/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toPublicUser } from "../common/public-user.mapper";
import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from "../common/token.module";
import { JwtRefreshPayload } from "./jwt-payload.interface";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
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
