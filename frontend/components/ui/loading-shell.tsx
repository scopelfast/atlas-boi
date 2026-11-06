export function LoadingShell({
  message = "Carregando…",
  hint,
}: {
  message?: string;
  hint?: string;
}) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#0a0a0a] px-6 text-center"
      style={{ minHeight: "100dvh" }}
    >
      <p className="text-base font-medium text-white">{message}</p>
      {hint && <p className="max-w-sm text-sm text-white/70">{hint}</p>}
    </div>
  );
}
