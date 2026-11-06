import type { Permission, User } from "@/hooks/useAuth";

export const PLATFORM_MODULE_SLUGS = ["empresas", "planos", "catalogo"] as const;

export function isPlatformAdmin(user: Pick<User, "role" | "permissions"> | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return (
    user.permissions?.some(
      (p) => p.module === "empresas" && ["create", "update", "delete"].includes(p.function)
    ) ?? false
  );
}

export function canAccessModule(
  user: Pick<User, "role" | "permissions"> | null | undefined,
  moduleSlug: string,
  permissions?: Permission[]
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const perms = permissions ?? user.permissions;
  if (!perms?.length) return false;
  return perms.some(
    (p) =>
      p.module === moduleSlug &&
      (p.function === "read" || p.function === "create" || p.function === "update")
  );
}
