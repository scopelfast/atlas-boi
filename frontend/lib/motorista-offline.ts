/** Fila offline de despesas do motorista (localStorage). */

const KEY = "motorista_outbox_despesas";

export type OutboxDespesa = {
  id: string;
  createdAt: string;
  payload: {
    valor: number;
    descricao?: string;
    observacoes?: string;
    carregamentoId?: string;
    veiculoId?: string;
    categoriaCusto?: string;
    formaPagamento?: "ADIANTAMENTO" | "DO_BOLSO";
  };
  /** Foto em data URL — opcional; limitado para não estourar quota */
  fotoDataUrl?: string;
  fotoNome?: string;
};

function read(): OutboxDespesa[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as OutboxDespesa[];
  } catch {
    return [];
  }
}

function write(items: OutboxDespesa[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listOutboxDespesas() {
  return read();
}

export function enqueueDespesa(item: Omit<OutboxDespesa, "id" | "createdAt">) {
  const row: OutboxDespesa = {
    ...item,
    id: `ox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const items = read();
  items.push(row);
  write(items);
  return row;
}

export function removeOutboxDespesa(id: string) {
  write(read().filter((x) => x.id !== id));
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function dataUrlToFile(dataUrl: string, nome: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], nome, { type: blob.type || "image/jpeg" });
}

export async function flushOutboxDespesas(
  send: (item: OutboxDespesa) => Promise<void>
): Promise<{ ok: number; fail: number }> {
  const items = read();
  let ok = 0;
  let fail = 0;
  for (const item of items) {
    try {
      await send(item);
      removeOutboxDespesa(item.id);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}
