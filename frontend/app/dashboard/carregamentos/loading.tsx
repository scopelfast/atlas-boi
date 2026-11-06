export default function CarregamentosLoading() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm font-medium text-foreground">Abrindo carregamentos…</p>
      <p className="text-xs text-muted-foreground">Preparando a tela</p>
    </div>
  );
}
