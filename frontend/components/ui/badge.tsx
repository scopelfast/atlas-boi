import { cn } from "@/utils/cn";

const variants: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-[#1E3A8A] text-white dark:bg-blue-800",
  secondary: "bg-[#2563EB] text-white dark:bg-blue-700",
  success: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white",
  active: "bg-emerald-600 font-medium text-white dark:bg-emerald-500 dark:text-white",
  inactive: "bg-muted font-medium text-muted-foreground dark:bg-white/10 dark:text-white/80",
  phase: "border border-emerald-400/40 bg-emerald-600 font-semibold text-white shadow-sm shadow-emerald-950/25 dark:border-emerald-400/50 dark:bg-emerald-500 dark:shadow-emerald-500/20",
  warning: "bg-[#FBBF24] text-gray-900 dark:text-gray-900",
  danger: "bg-[#EF4444] text-white dark:bg-red-700",
  outline: "border border-border bg-background text-foreground",
};

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { variant?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
