import { BadRequestException } from "@nestjs/common";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import { UPLOADS_ROOT, resolveUploadPath } from "./carregamento-uploads";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

export async function saveLancamentoComprovante(
  companyId: string,
  lancamentoId: string,
  buffer: Buffer,
  originalName: string
): Promise<{ path: string; nome: string }> {
  const ext = extname(originalName).toLowerCase() || ".jpg";
  if (!ALLOWED_EXT.has(ext)) {
    throw new BadRequestException("Use JPG, PNG, WEBP ou PDF para o comprovante");
  }

  const dir = join(UPLOADS_ROOT, "financeiro", companyId, lancamentoId);
  await mkdir(dir, { recursive: true });

  const filename = `comprovante${ext}`;
  const relativePath = `financeiro/${companyId}/${lancamentoId}/${filename}`;
  await writeFile(resolveUploadPath(relativePath), buffer);

  return { path: relativePath, nome: originalName };
}

export function mimeComprovante(relativePath: string): string {
  const ext = extname(relativePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return map[ext] ?? "application/octet-stream";
}
