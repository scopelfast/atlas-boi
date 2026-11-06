export const TOKEN_KEY = "atlas_boi_token";
export const USER_KEY = "atlas_boi_user";

export function clearAuthStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Token demo do fallback de dev — não funciona com a API real */
export function isDemoToken(token: string | null | undefined): boolean {
  return !!token?.startsWith("demo-token-");
}

export function loadAuthFromStorage(): { token: string | null; user: string | null } {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);
  if (isDemoToken(token)) {
    clearAuthStorage();
    return { token: null, user: null };
  }
  return { token, user };
}
