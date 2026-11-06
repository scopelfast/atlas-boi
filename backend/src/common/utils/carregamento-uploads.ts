import { BadRequestException } from "@nestjs/common";
import { mkdir, unlink, writeFile } from "fs/promises";
import { extname, join } from "path";

export const UPLOADS_ROOT = join(process.cwd(), "uploads");

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);

export function resolveUploadPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.includes("..")) {
    throw new BadRequestException("Caminho de arquivo inválido");
  }
  return join(UPLOADS_ROOT, normalized);
}

export async function saveCarregamentoMinutaFoto(
  companyId: string,
  carregamentoId: string,
  buffer: Buffer,
  originalName: string
): Promise<{ path: string; nome: string }> {
  const ext = extname(originalName).toLowerCase() || ".jpg";
  if (!ALLOWED_EXT.has(ext)) {
    throw new BadRequestException("Use JPG, PNG ou WEBP para a foto da minuta");
  }

  const dir = join(UPLOADS_ROOT, "carregamentos", companyId, carregamentoId);
  await mkdir(dir, { recursive: true });

  const filename = `minuta${ext}`;
  const relativePath = `carregamentos/${companyId}/${carregamentoId}/${filename}`;
  await writeFile(resolveUploadPath(relativePath), buffer);

  return { path: relativePath, nome: originalName };
}

export async function saveCarregamentoCargaFoto(
  companyId: string,
  carregamentoId: string,
  buffer: Buffer,
  originalName: string
): Promise<{ path: string; nome: string }> {
  const ext = extname(originalName).toLowerCase() || ".jpg";
  if (!ALLOWED_EXT.has(ext)) {
    throw new BadRequestException("Use JPG, PNG ou WEBP para a foto da carga");
  }

  const dir = join(UPLOADS_ROOT, "carregamentos", companyId, carregamentoId, "carga");
  await mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const relativePath = `carregamentos/${companyId}/${carregamentoId}/carga/${filename}`;
  await writeFile(resolveUploadPath(relativePath), buffer);

  return { path: relativePath, nome: originalName };
}

export async function deleteStoredFile(relativePath: string | null | undefined) {
  if (!relativePath) return;
  try {
    await unlink(resolveUploadPath(relativePath));
  } catch {
    /* arquivo já removido */
  }
}

export function mimeFromPath(relativePath: string): string {
  const ext = extname(relativePath).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".heif": "image/heif",
  };
  return map[ext] ?? "application/octet-stream";
}
