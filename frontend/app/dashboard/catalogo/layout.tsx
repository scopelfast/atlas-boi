import { PlatformGuard } from "@/components/layout/PlatformGuard";

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return <PlatformGuard>{children}</PlatformGuard>;
}
