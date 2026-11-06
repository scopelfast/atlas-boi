"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const onNgrok = typeof window !== "undefined" && /ngrok/i.test(window.location.hostname);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0a0a0a] px-6 text-center text-white">
      <h1 className="text-lg font-semibold">Algo deu errado ao carregar a página</h1>
      <p className="max-w-md text-sm text-white/75">
        {onNgrok
          ? "No celular via ngrok: toque em «Visit Site», depois recarregue. Se persistir, peça ao dev para usar npm run demo:full:cf (Cloudflare)."
          : "Tente recarregar. Se o problema continuar, reinicie o frontend."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          Tentar de novo
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.location.assign("/login")}>
          Ir para login
        </Button>
      </div>
    </div>
  );
}
