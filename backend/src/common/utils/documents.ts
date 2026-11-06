/**
 * Validação CNPJ numérico e alfanumérico (regra RFB 2026).
 * DV: módulo 11 com valor do caractere = ASCII(c) - 48
 */

function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/** Normaliza documento CNPJ (numérico ou alfanumérico 2026) */
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

const WEIGHTS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const WEIGHTS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function validateCnpj(value: string): boolean {
  const raw = normalizeDocumento(value);
  if (raw.length !== 14) return false;
  if (!/^[A-Z0-9]{12}\d{2}$/.test(raw)) return false;
  if (/^\d{14}$/.test(raw) && /^(\d)\1+$/.test(raw)) return false;

  const dv1 = calcCnpjCheckDigit(raw.slice(0, 12), WEIGHTS_DV1);
  if (dv1 < 0 || parseInt(raw[12], 10) !== dv1) return false;

  const dv2 = calcCnpjCheckDigit(raw.slice(0, 12) + String(dv1), WEIGHTS_DV2);
  if (dv2 < 0 || parseInt(raw[13], 10) !== dv2) return false;

  return true;
}

export function validateCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10) digit1 = 0;
  if (parseInt(d[9]) !== digit1) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10) digit2 = 0;
  return parseInt(d[10]) === digit2;
}

export function toCnpjRaw(value: string): string {
  return normalizeDocumento(value);
}

export function toCpfRaw(value: string): string {
  return onlyDigits(value).slice(0, 11);
}

export function isCnpjAlphanumerico(value: string): boolean {
  const raw = normalizeDocumento(value);
  return /^[A-Z0-9]{12}\d{2}$/.test(raw) && /[A-Z]/.test(raw.slice(0, 12));
}

/** Máscara de exibição: numérico ou alfanumérico */
export function formatCnpjDisplay(value: string): string {
  const raw = normalizeDocumento(value);
  if (raw.length <= 2) return raw;
  if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`;
  if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
  if (raw.length <= 12) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`;
}
