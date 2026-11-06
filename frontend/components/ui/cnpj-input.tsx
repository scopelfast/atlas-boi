"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  maskCnpj,
  validateCnpj,
  toCnpjRaw,
  normalizeDocumento,
  isCnpjAlphanumerico,
} from "@/lib/documents";
import { fetchCnpjData } from "@/services/brasil-api";

export interface CnpjInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string, raw: string) => void;
  onCnpjData?: (data: { razaoSocial: string; nomeFantasia?: string }) => void;
  error?: string;
  hint?: string;
}

export const CnpjInput = React.forwardRef<HTMLInputElement, CnpjInputProps>(
  ({ value, onChange, onCnpjData, error, hint, className, id, ...props }, ref) => {
    const [localError, setLocalError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const displayError = error ?? localError;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const upper = e.target.value.toUpperCase();
      const masked = maskCnpj(upper);
      onChange(masked, toCnpjRaw(masked));
      setLocalError(null);
    };

    const handleBlur = () => {
      if (!value.trim()) return;
      const result = validateCnpj(value);
      if (!result.valid) setLocalError(result.error ?? "CNPJ inválido");
    };

    const handleSearch = async () => {
      const result = validateCnpj(value);
      if (!result.valid) {
        setLocalError(result.error ?? "CNPJ inválido");
        return;
      }
      setLoading(true);
      setLocalError(null);
      try {
        const data = await fetchCnpjData(value);
        if (data) {
          onCnpjData?.({
            razaoSocial: data.razao_social,
            nomeFantasia: data.nome_fantasia ?? undefined,
          });
          setLocalError(null);
        } else {
          setLocalError("CNPJ não encontrado na Receita Federal");
        }
      } catch {
        setLocalError("Erro ao consultar CNPJ");
      } finally {
        setLoading(false);
      }
    };

    const raw = toCnpjRaw(value);
    const canSearch = raw.length === 14 && /^\d{14}$/.test(raw) && !loading && !isCnpjAlphanumerico(raw);

    return (
      <div className="space-y-1">
        <div className="flex gap-2">
          <input
            ref={ref}
            type="text"
            inputMode="text"
            id={id}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="00.000.000/0001-00 ou AB.CDE.FGH/0001-00"
            maxLength={18}
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
          {onCnpjData && (
            <button
              type="button"
              onClick={handleSearch}
              disabled={!canSearch}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:bg-muted disabled:opacity-50"
              title="Buscar dados na Receita Federal"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
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
CnpjInput.displayName = "CnpjInput";
