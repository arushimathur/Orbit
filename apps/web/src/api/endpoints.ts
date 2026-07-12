import {
  AuthResponse,
  Circle,
  CircleMember,
  CreateCircleDto,
  JoinCircleDto,
  LoginDto,
  MemberLocation,
  PublicUser,
  RegisterDto,
} from "@fetchlocation/shared";
import { apiFetch } from "./client";
import { tokenStore } from "./tokenStore";

export async function register(dto: RegisterDto): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/auth/register", { method: "POST", body: dto, auth: false });
  tokenStore.setTokens(res.tokens.accessToken, res.tokens.refreshToken);
  return res;
}

export async function login(dto: LoginDto): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/auth/login", { method: "POST", body: dto, auth: false });
  tokenStore.setTokens(res.tokens.accessToken, res.tokens.refreshToken);
  return res;
}

export function logout(): void {
  tokenStore.clear();
}

export function me(): Promise<PublicUser> {
  return apiFetch<PublicUser>("/auth/me");
}

export function createCircle(dto: CreateCircleDto): Promise<Circle> {
  return apiFetch<Circle>("/circles", { method: "POST", body: dto });
}

export function joinCircle(dto: JoinCircleDto): Promise<Circle> {
  return apiFetch<Circle>("/circles/join", { method: "POST", body: dto });
}

export function listMembers(circleId: string): Promise<CircleMember[]> {
  return apiFetch<CircleMember[]>(`/circles/${circleId}/members`);
}

export function getLatestLocations(circleId: string): Promise<MemberLocation[]> {
  return apiFetch<MemberLocation[]>(`/circles/${circleId}/locations/latest`);
}
