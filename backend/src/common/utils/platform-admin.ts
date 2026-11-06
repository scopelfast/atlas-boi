export type AuthUserPayload = {
  role: string;
  permissions?: { module: string; function: string }[];
};

/** Módulos exclusivos da operadora SaaS — nunca para admin de transportadora */
export const PLATFORM_MODULE_SLUGS = ["empresas", "planos", "catalogo"] as const;

export function isPlatformAdmin(user: AuthUserPayload | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return (
    user.permissions?.some(
      (p) => p.module === "empresas" && ["create", "update", "delete"].includes(p.function)
    ) ?? false
  );
}

export function hasModuleAccess(
  user: AuthUserPayload,
  moduleSlug: string,
  fn = "read"
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.permissions?.some((p) => p.module === moduleSlug && p.function === fn) ?? false;
}
