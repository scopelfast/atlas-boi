"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a0a0a", color: "#fff" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            gap: "16px",
          }}
        >
          <h1 style={{ fontSize: "18px", margin: 0 }}>Erro crítico na aplicação</h1>
          <p style={{ fontSize: "14px", opacity: 0.8, maxWidth: "360px", margin: 0 }}>
            Recarregue a página. Via ngrok no celular: confirme «Visit Site» e use /login (não /dashboard).
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "none",
              background: "#1a5c2e",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
          {process.env.NODE_ENV === "development" && (
            <pre style={{ fontSize: "11px", opacity: 0.6, maxWidth: "100%", overflow: "auto" }}>
              {error.message}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
