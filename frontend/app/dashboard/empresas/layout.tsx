import { PlatformGuard } from "@/components/layout/PlatformGuard";

export default function EmpresasLayout({ children }: { children: React.ReactNode }) {
  return <PlatformGuard>{children}</PlatformGuard>;
}
