import { apiFetch, getApiBaseUrl } from "./client";
import type { AuthProvider, AuthUser } from "./types";

type MePayload =
  | { authenticated: true; user: AuthUser }
  | { authenticated: false; user: null };

export function me(): Promise<MePayload> {
  return apiFetch<MePayload>("/api/v1/me", { skipAuthRedirect: true });
}

export function providers(): Promise<AuthProvider[]> {
  return apiFetch<AuthProvider[]>("/api/v1/auth/providers", { skipAuthRedirect: true });
}

export function oauthStartUrl(providerId: string, redirectPath = "/todo"): string {
  const params = new URLSearchParams({ redirect: redirectPath });
  return `${getApiBaseUrl()}/api/v1/auth/${encodeURIComponent(providerId)}/start?${params.toString()}`;
}

export async function startEmail(email: string): Promise<void> {
  await apiFetch<{ accepted: boolean }>("/api/v1/auth/email/start", {
    method: "POST",
    body: JSON.stringify({ email }),
    skipAuthRedirect: true
  });
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/api/v1/auth/logout", { method: "POST", skipAuthRedirect: true });
}
