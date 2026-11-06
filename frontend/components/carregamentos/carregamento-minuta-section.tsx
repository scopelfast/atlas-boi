"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Download, Expand, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/cn";
import { carregamentosApi } from "@/services/api";

type Props = {
  carregamentoId?: string | null;
  numeroMinuta: string;
  fotoNome?: string | null;
  onNumeroMinutaChange: (value: string) => void;
  hasFoto: boolean;
  onFotoChange?: () => void;
  onPendingFile?: (file: File | null) => void;
  className?: string;
};

export function CarregamentoMinutaSection({
  carregamentoId,
  numeroMinuta,
  fotoNome,
  onNumeroMinutaChange,
  hasFoto,
  onFotoChange,
  onPendingFile,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!carregamentoId || !hasFoto) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    carregamentosApi
      .fetchMinutaFotoBlob(carregamentoId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [carregamentoId, hasFoto]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const displayPreview = localPreview ?? previewUrl;
  const downloadName =
    localFileName ??
    fotoNome ??
    (numeroMinuta ? `minuta-${numeroMinuta}.jpg` : "minuta.jpg");

  const handleDownload = async () => {
    if (!displayPreview) return;
    try {
      const response = await fetch(displayPreview);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Não foi possível baixar a imagem.");
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem (foto da minuta).");
      return;
    }

    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    setLocalFileName(file.name);

    if (!carregamentoId) {
      onPendingFile?.(file);
      return;
    }

    setUploading(true);
    try {
      await carregamentosApi.uploadMinutaFoto(carregamentoId, file);
      setLocalPreview(null);
      setLocalFileName(null);
      onFotoChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar foto");
      setLocalPreview(null);
      setLocalFileName(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!carregamentoId || !hasFoto) {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
        setLocalPreview(null);
      }
      setLocalFileName(null);
      onPendingFile?.(null);
      return;
    }
    setRemoving(true);
    setError(null);
    try {
      await carregamentosApi.removeMinutaFoto(carregamentoId);
      setLocalPreview(null);
      setLocalFileName(null);
      onFotoChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover foto");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <section className={cn("space-y-4", className)}>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Minuta / ordem de coleta</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Documento manual preenchido no embarque. Informe o número impresso na minuta e fotografe
            o papel.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Label htmlFor="numero-minuta">Nº da minuta</Label>
            <Input
              id="numero-minuta"
              className="mt-1 font-mono tabular-nums"
              placeholder="Ex.: 749702, 227, 66641…"
              value={numeroMinuta}
              onChange={(e) => onNumeroMinutaChange(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Número que consta no documento físico — não confundir com o código interno do sistema.
            </p>
          </div>

          <div>
            <Label>Foto da minuta</Label>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {displayPreview ? (
              <div className="mt-1 overflow-hidden rounded-xl border border-border bg-background">
                <button
                  type="button"
                  className="group relative block w-full cursor-zoom-in"
                  onClick={() => setLightboxOpen(true)}
                  title="Ver em tamanho original"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayPreview}
                    alt="Foto da minuta"
                    className="max-h-64 w-full object-contain bg-black/5 transition-opacity group-hover:opacity-90 dark:bg-black/20"
                  />
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Expand className="h-3 w-3" />
                    Ampliar
                  </span>
                </button>
                <div className="flex flex-wrap gap-2 border-t border-border p-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setLightboxOpen(true)}
                  >
                    <Expand className="mr-1.5 h-4 w-4" />
                    Ver original
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={handleDownload}>
                    <Download className="mr-1.5 h-4 w-4" />
                    Baixar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploading || removing}
                    onClick={() => inputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-1.5 h-4 w-4" />
                    )}
                    Trocar foto
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={uploading || removing}
                    onClick={handleRemove}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Remover
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="mt-1 flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-primary/80" />
                )}
                <span className="font-medium">Tirar foto ou escolher imagem</span>
                <span className="text-xs">Câmera do celular ou galeria · JPG, PNG</span>
                {!carregamentoId && (
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    Pré-visualização local — salve o carregamento para anexar definitivamente.
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-h-[95vh] max-w-[min(95vw,56rem)] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="text-base">
              Minuta {numeroMinuta ? `nº ${numeroMinuta}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(95vh-8rem)] overflow-auto bg-black/90 p-2 sm:p-4">
            {displayPreview && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displayPreview}
                alt="Foto da minuta em tamanho original"
                className="mx-auto h-auto max-h-[calc(95vh-10rem)] w-auto max-w-full object-contain"
              />
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
            <Button type="button" variant="secondary" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              Baixar imagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
