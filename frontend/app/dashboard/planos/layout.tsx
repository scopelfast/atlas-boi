import { PlatformGuard } from "@/components/layout/PlatformGuard";

export default function PlanosLayout({ children }: { children: React.ReactNode }) {
  return <PlatformGuard>{children}</PlatformGuard>;
}
