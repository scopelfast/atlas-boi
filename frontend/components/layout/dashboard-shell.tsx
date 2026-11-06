"use client";

import dynamic from "next/dynamic";
import { DashboardGuard } from "@/components/layout/DashboardGuard";

const Sidebar = dynamic(
  () => import("@/components/layout/Sidebar").then((m) => ({ default: m.Sidebar })),
  {
    ssr: false,
    loading: () => <aside className="w-64 shrink-0 bg-[#0a0a0a]" aria-hidden />,
  }
);

const Header = dynamic(
  () => import("@/components/layout/Header").then((m) => ({ default: m.Header })),
  {
    ssr: false,
    loading: () => <header className="h-16 shrink-0 border-b border-border" aria-hidden />,
  }
);

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="scrollbar-atlas flex-1 overflow-auto bg-background p-8">{children}</main>
        </div>
      </div>
    </DashboardGuard>
  );
}
