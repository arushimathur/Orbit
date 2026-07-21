import {
  AuthResponse,
  Circle,
  CirclePlace,
  CirclePreview,
  CircleMember,
  CreateCircleDto,
  CreateLocationPingDto,
  CreatePlaceDto,
  ForgotPasswordDto,
  JoinCircleDto,
  LoginDto,
  LocationPing,
  MemberLocation,
  MutedMember,
  Nickname,
  Notification,
  NotificationPreferences,
  PauseSharingDto,
  PlaceSuggestion,
  PublicUser,
  RegisterDto,
  ResetPasswordDto,
  SavedLocation,
  SetNicknameDto,
  SetPrecisionDto,
  SharingStatus,
  UpdateNotificationPreferencesDto,
  UpdateProfileDto,
} from "@orbit/shared";
import { apiFetch } from "./client";
import { tokenStore } from "./tokenStore";

export async function register(dto: RegisterDto): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/auth/register", { method: "POST", body: dto, auth: false });
  await tokenStore.setTokens(res.tokens.accessToken, res.tokens.refreshToken);
  return res;
}

export async function login(dto: LoginDto): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/auth/login", { method: "POST", body: dto, auth: false });
  await tokenStore.setTokens(res.tokens.accessToken, res.tokens.refreshToken);
  return res;
}

export async function logout(): Promise<void> {
  await tokenStore.clear();
}

export function forgotPassword(dto: ForgotPasswordDto): Promise<void> {
  return apiFetch<void>("/auth/forgot-password", { method: "POST", body: dto, auth: false });
}

export function resetPassword(dto: ResetPasswordDto): Promise<void> {
  return apiFetch<void>("/auth/reset-password", { method: "POST", body: dto, auth: false });
}

export function me(): Promise<PublicUser> {
  return apiFetch<PublicUser>("/auth/me");
}

export function updateProfile(dto: UpdateProfileDto): Promise<PublicUser> {
  return apiFetch<PublicUser>("/auth/me", { method: "PATCH", body: dto });
}

export function getMyCircles(): Promise<Circle[]> {
  return apiFetch<Circle[]>("/circles/mine");
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

export function leaveCircle(circleId: string): Promise<void> {
  return apiFetch<void>(`/circles/${circleId}/members/me`, { method: "DELETE" });
}

export function suggestInviteCode(name: string, exclude?: string): Promise<{ code: string }> {
  const params = new URLSearchParams({ name, ...(exclude ? { exclude } : {}) });
  return apiFetch<{ code: string }>(`/circles/suggest-code?${params.toString()}`);
}

export function getCirclePreview(inviteCode: string): Promise<CirclePreview> {
  return apiFetch<CirclePreview>(`/circles/preview/${inviteCode}`, { auth: false });
}

export function setCirclePrecision(circleId: string, dto: SetPrecisionDto): Promise<void> {
  return apiFetch<void>(`/circles/${circleId}/precision`, { method: "PATCH", body: dto });
}

export function postLocation(dto: CreateLocationPingDto): Promise<LocationPing> {
  return apiFetch<LocationPing>("/locations", { method: "POST", body: dto });
}

export function getLatestLocations(circleId: string): Promise<MemberLocation[]> {
  return apiFetch<MemberLocation[]>(`/circles/${circleId}/locations/latest`);
}

export function updatePushToken(pushToken: string): Promise<void> {
  return apiFetch<void>("/auth/push-token", { method: "PATCH", body: { pushToken } });
}

export function listPlaces(): Promise<SavedLocation[]> {
  return apiFetch<SavedLocation[]>("/places");
}

export function listCirclePlaces(circleId: string): Promise<CirclePlace[]> {
  return apiFetch<CirclePlace[]>(`/circles/${circleId}/places`);
}

export function suggestPlaces(): Promise<PlaceSuggestion[]> {
  return apiFetch<PlaceSuggestion[]>("/places/suggestions");
}

export function createPlace(dto: CreatePlaceDto): Promise<SavedLocation> {
  return apiFetch<SavedLocation>("/places", { method: "POST", body: dto });
}

export function deletePlace(id: string): Promise<void> {
  return apiFetch<void>(`/places/${id}`, { method: "DELETE" });
}

export function getSharingStatus(): Promise<SharingStatus> {
  return apiFetch<SharingStatus>("/sharing/status");
}

export function pauseSharing(dto: PauseSharingDto): Promise<SharingStatus> {
  return apiFetch<SharingStatus>("/sharing/pause", { method: "PATCH", body: dto });
}

export function resumeSharing(): Promise<SharingStatus> {
  return apiFetch<SharingStatus>("/sharing/resume", { method: "PATCH" });
}

export function getPreferences(): Promise<NotificationPreferences> {
  return apiFetch<NotificationPreferences>("/preferences");
}

export function updatePreferences(dto: UpdateNotificationPreferencesDto): Promise<NotificationPreferences> {
  return apiFetch<NotificationPreferences>("/preferences", { method: "PATCH", body: dto });
}

export function listMutedMembers(): Promise<MutedMember[]> {
  return apiFetch<MutedMember[]>("/preferences/muted");
}

export function muteMember(userId: string): Promise<void> {
  return apiFetch<void>(`/preferences/mute/${userId}`, { method: "PUT" });
}

export function unmuteMember(userId: string): Promise<void> {
  return apiFetch<void>(`/preferences/mute/${userId}`, { method: "DELETE" });
}

export function listNicknames(): Promise<Nickname[]> {
  return apiFetch<Nickname[]>("/nicknames");
}

export function setNickname(targetUserId: string, dto: SetNicknameDto): Promise<Nickname> {
  return apiFetch<Nickname>(`/nicknames/${targetUserId}`, { method: "PUT", body: dto });
}

export function clearNickname(targetUserId: string): Promise<void> {
  return apiFetch<void>(`/nicknames/${targetUserId}`, { method: "DELETE" });
}

export function listNotifications(): Promise<Notification[]> {
  return apiFetch<Notification[]>("/notifications");
}

export function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>("/notifications/read-all", { method: "PATCH" });
}
