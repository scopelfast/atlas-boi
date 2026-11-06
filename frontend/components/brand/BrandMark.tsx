import { cn } from "@/utils/cn";
import { BRAND } from "./brand";
import { BrandLogoBlock } from "./brand-logo-block";

type BrandMarkProps = {
  variant?: "login" | "dashboard" | "header" | "sidebar";
  showLogo?: boolean;
  className?: string;
};

export function BrandMark({
  variant = "login",
  showLogo = false,
  className,
}: BrandMarkProps) {
  if (variant === "header") {
    return (
      <div className={cn("flex shrink-0 items-center gap-2", className)}>
        <span className="h-2 w-2 rounded-full bg-[#1a5c2e]" aria-hidden />
        <p className="text-sm font-bold tracking-tight text-foreground">{BRAND.name}</p>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={cn("px-4 pb-3 pt-2 text-center", className)}>
        <p className="text-base font-bold tracking-tight text-foreground">{BRAND.name}</p>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className={cn(className)}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{BRAND.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{BRAND.subtitle}</p>
      </div>
    );
  }

  return (
    <div className={cn("text-center", className)}>
      {showLogo && (
        <BrandLogoBlock className="mb-3" priority sizes="320px" />
      )}
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{BRAND.name}</h1>
      {!showLogo && (
        <>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#1a5c2e] dark:text-emerald-400">
            {BRAND.tagline}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{BRAND.subtitle}</p>
        </>
      )}
    </div>
  );
}
