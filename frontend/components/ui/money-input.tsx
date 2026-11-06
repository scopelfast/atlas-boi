"use client";

import * as React from "react";
import { cn } from "@/utils/cn";
import { maskMoneyInput, parseMoneyBRL } from "@/lib/documents";

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (display: string, numeric: number | undefined) => void;
  hint?: string;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, hint, className, id, placeholder = "0,00", ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskMoneyInput(e.target.value);
      onChange(masked, parseMoneyBRL(masked));
    };

    return (
      <div>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            R$
          </span>
          <input
            ref={ref}
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={placeholder}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background pl-10 pr-3 py-1 text-sm tabular-nums shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
            value={value}
            onChange={handleChange}
            {...props}
          />
        </div>
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  }
);
MoneyInput.displayName = "MoneyInput";
