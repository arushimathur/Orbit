export interface JwtAccessPayload {
  sub: string;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
}
