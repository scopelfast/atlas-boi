"use client";

import * as React from "react";
import { cn } from "@/utils/cn";
import { maskCpf, validateCpf, toCpfRaw } from "@/lib/documents";

export interface CpfInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string, raw: string) => void;
  error?: string;
  hint?: string;
}

/**
 * CPF: validação + máscara.
 * Consulta via API é restrita (LGPD). Serviços pagos existem para validação em tempo real.
 */
export const CpfInput = React.forwardRef<HTMLInputElement, CpfInputProps>(
  ({ value, onChange, error, hint, className, id, ...props }, ref) => {
    const [localError, setLocalError] = React.useState<string | null>(null);
    const displayError = error ?? localError;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCpf(e.target.value);
      onChange(masked, toCpfRaw(masked));
      setLocalError(null);
    };

    const handleBlur = () => {
      if (!value.trim()) return;
      const result = validateCpf(value);
      if (!result.valid) setLocalError(result.error ?? "CPF inválido");
    };

    return (
      <div className="space-y-1">
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          id={id}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="000.000.000-00"
          maxLength={14}
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground transition-colors",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 focus:border-[#1a5c2e] dark:focus:ring-emerald-500/20 dark:focus:border-emerald-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            displayError && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
            className
          )}
          aria-invalid={!!displayError}
          {...props}
        />
        {hint && !displayError && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
        {displayError && (
          <p className="text-xs text-destructive">{displayError}</p>
        )}
      </div>
    );
  }
);
CpfInput.displayName = "CpfInput";
