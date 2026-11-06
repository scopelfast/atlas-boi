import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { BRAND } from "@/components/brand/brand";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
      <BrandMark variant="login" showLogo className="max-w-md" />
      <p className="max-w-md text-center text-muted-foreground">{BRAND.subtitle}</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-xl bg-[#1a5c2e] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-[#1a5c2e]/25 transition-all hover:bg-[#145024] dark:shadow-emerald-900/40"
        >
          Entrar
        </Link>
        <Link
          href="/login"
          className="rounded-xl border-2 border-border bg-card px-6 py-3 text-base font-semibold text-foreground transition-all hover:border-[#1a5c2e] hover:text-[#1a5c2e] dark:hover:border-emerald-500 dark:hover:text-emerald-400"
        >
          Acessar Dashboard
        </Link>
      </div>
    </main>
  );
}
