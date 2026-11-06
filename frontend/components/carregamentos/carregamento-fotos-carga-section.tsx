"use client";

import { useEffect, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { carregamentosApi } from "@/services/api";

const MOMENTO_LABEL: Record<string, string> = {
  EMBARQUE: "Embarque",
  TRANSITO: "Na estrada",
  DESCARGA: "Descarga",
  OUTROS: "Outros",
};

type Foto = {
  id: string;
  momento: string;
  nome: string;
  observacao?: string | null;
  createdAt: string;
  motorista?: { id: string; nome: string } | null;
};

export function CarregamentoFotosCargaSection({
  carregamentoId,
}: {
  carregamentoId: string | null;
}) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function load() {
    if (!carregamentoId) {
      setFotos([]);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      setFotos(await carregamentosApi.listarFotosCarga(carregamentoId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar fotos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregamentoId]);

  async function remover(fotoId: string) {
    if (!carregamentoId || !confirm("Remover esta foto?")) return;
    await carregamentosApi.removeFotoCarga(carregamentoId, fotoId);
    await load();
  }

  if (!carregamentoId) {
    return (
      <p className="text-sm text-muted-foreground">
        Salve o carregamento para ver fotos enviadas pelo motorista.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-emerald-700" />
        <h3 className="text-sm font-semibold">Fotos da carga (app motorista)</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Embarque, estrada e descarga — evidência operacional dos animais.
      </p>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!loading && fotos.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Nenhuma foto enviada ainda
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fotos.map((f) => (
          <FotoCard
            key={f.id}
            carregamentoId={carregamentoId}
            foto={f}
            onRemove={() => remover(f.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FotoCard({
  carregamentoId,
  foto,
  onRemove,
}: {
  carregamentoId: string;
  foto: Foto;
  onRemove: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    carregamentosApi.fetchFotoCargaBlob(carregamentoId, foto.id).then((blob) => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [carregamentoId, foto.id]);

  return (
    <article className="overflow-hidden rounded-lg border bg-card">
      <div className="aspect-[4/3] bg-muted">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={foto.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">…</div>
        )}
      </div>
      <div className="space-y-1 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline">{MOMENTO_LABEL[foto.momento] ?? foto.momento}</Badge>
          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(foto.createdAt).toLocaleString("pt-BR")}
          {foto.motorista?.nome ? ` · ${foto.motorista.nome}` : ""}
        </p>
        {foto.observacao && <p className="text-xs">{foto.observacao}</p>}
      </div>
    </article>
  );
}
