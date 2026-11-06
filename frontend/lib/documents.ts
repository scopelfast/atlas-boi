/**
 * CNPJ numérico e alfanumérico (RFB 2026) + CPF
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeDocumento(value: string): string {
  return (value || "").replace(/[.\-/]/g, "").toUpperCase().slice(0, 14);
}

function cnpjCharValue(c: string): number {
  const code = c.toUpperCase().charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 65 && code <= 90) return code - 48;
  return -1;
}

function calcCnpjCheckDigit(base: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    const v = cnpjCharValue(base[i] ?? "");
    if (v < 0) return -1;
    sum += v * weights[i];
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

const W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function validateCnpj(value: string): { valid: boolean; error?: string } {
  const raw = normalizeDocumento(value);
  if (raw.length !== 14) return { valid: false, error: "CNPJ deve ter 14 caracteres" };
  if (!/^[A-Z0-9]{12}\d{2}$/.test(raw)) {
    return { valid: false, error: "CNPJ inválido (use 12 alfanuméricos + 2 dígitos)" };
  }
  if (/^\d{14}$/.test(raw) && /^(\d)\1+$/.test(raw)) {
    return { valid: false, error: "CNPJ inválido" };
  }
  const dv1 = calcCnpjCheckDigit(raw.slice(0, 12), W1);
  if (dv1 < 0 || parseInt(raw[12], 10) !== dv1) return { valid: false, error: "CNPJ inválido" };
  const dv2 = calcCnpjCheckDigit(raw.slice(0, 12) + String(dv1), W2);
  if (dv2 < 0 || parseInt(raw[13], 10) !== dv2) return { valid: false, error: "CNPJ inválido" };
  return { valid: true };
}

export function validateCpf(value: string): { valid: boolean; error?: string } {
  const d = onlyDigits(value);
  if (d.length !== 11) return { valid: false, error: "CPF deve ter 11 dígitos" };
  if (/^(\d)\1+$/.test(d)) return { valid: false, error: "CPF inválido" };
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10) digit1 = 0;
  if (parseInt(d[9]) !== digit1) return { valid: false, error: "CPF inválido" };
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10) digit2 = 0;
  if (parseInt(d[10]) !== digit2) return { valid: false, error: "CPF inválido" };
  return { valid: true };
}

export function maskCnpj(value: string): string {
  const raw = normalizeDocumento(value);
  if (raw.length <= 2) return raw;
  if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`;
  if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
  if (raw.length <= 12) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`;
}

export function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function toCnpjRaw(value: string): string {
  return normalizeDocumento(value);
}

export function toCpfRaw(value: string): string {
  return onlyDigits(value).slice(0, 11);
}

export function formatCnpjDisplay(value: string): string {
  if (!value) return "";
  const raw = normalizeDocumento(value);
  return raw.length === 14 ? maskCnpj(raw) : value;
}

export function formatCpfDisplay(value: string): string {
  if (!value) return "";
  const d = onlyDigits(value);
  return d.length === 11 ? maskCpf(d) : value;
}

export function isCnpjAlphanumerico(value: string): boolean {
  const raw = normalizeDocumento(value);
  return /^[A-Z0-9]{12}\d{2}$/.test(raw) && /[A-Z]/.test(raw.slice(0, 12));
}

export function parseMoneyBRL(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed.replace(/[^\d.-]/g, "");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : undefined;
}

export function formatMoneyBRL(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : parseMoneyBRL(String(value));
  if (n == null || !Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function maskMoneyInput(value: string): string {
  const digits = onlyDigits(value);
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  if (!Number.isFinite(cents)) return "";
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
