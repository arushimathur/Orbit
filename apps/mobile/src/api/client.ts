import { AuthTokens } from "@orbit/shared";
import { API_URL } from "../config";
import { tokenStore } from "./tokenStore";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let refreshInFlight: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  const refreshToken = await tokenStore.getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await tokenStore.clear();
    return null;
  }

  const tokens: AuthTokens = await res.json();
  await tokenStore.setTokens(tokens.accessToken, tokens.refreshToken);
  return tokens;
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const doRequest = async (accessToken: string | null): Promise<Response> =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let accessToken = auth ? await tokenStore.getAccessToken() : null;
  let res = await doRequest(accessToken);

  if (res.status === 401 && auth) {
    refreshInFlight ??= refreshTokens().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;
    if (refreshed) {
      accessToken = refreshed.accessToken;
      res = await doRequest(accessToken);
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, errorBody.message ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
