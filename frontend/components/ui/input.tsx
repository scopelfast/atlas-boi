import * as React from "react";
import { cn } from "@/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, hint, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <input
          type={type}
          id={id}
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground transition-colors",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 focus:border-[#1a5c2e] dark:focus:ring-emerald-500/20 dark:focus:border-emerald-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...props}
        />
        {hint && !error && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
