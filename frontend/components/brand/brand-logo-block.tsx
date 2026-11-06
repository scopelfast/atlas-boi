import { cn } from "@/utils/cn";
import { Logo } from "./Logo";

/** Card idêntico ao da tela de login — segue o tema claro/escuro global */
export const brandLogoCardClasses =
  "rounded-2xl border border-border bg-card/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-sm dark:border-white/10 sm:p-6";

/** Mesma apresentação da logomarca na tela de login */
export function BrandLogoBlock({
  className,
  sizes = "320px",
  priority = false,
}: {
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("flex justify-center", className)}>
      <Logo
        className="w-auto max-w-full"
        imageClassName="h-auto max-h-[100px] w-auto max-w-[320px] object-contain sm:max-h-[112px]"
        priority={priority}
        sizes={sizes}
      />
    </div>
  );
}

export function BrandLogoCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(brandLogoCardClasses, className)}>{children}</div>;
}
