"use client";

import { useEffect } from "react";
import { getStoredToken } from "@/lib/auth-storage";

/**
 * Conecta ao SSE do dashboard e dispara `atlas-dashboard-refresh` em eventos ao vivo.
 * Fallback: polling de 30s permanece no componente pai.
 */
export function useDashboardSse(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const token = getStoredToken();
    if (!token) return;

    const controller = new AbortController();
    let closed = false;

    async function connect() {
      while (!closed && !controller.signal.aborted) {
        try {
          const res = await fetch("/api/dashboard/events", {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          if (!res.ok || !res.body) break;

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!closed && !controller.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";
            for (const chunk of parts) {
              if (chunk.includes("data:")) {
                window.dispatchEvent(new CustomEvent("atlas-dashboard-refresh"));
              }
            }
          }
        } catch {
          if (controller.signal.aborted) break;
        }
        if (!closed) await new Promise((r) => setTimeout(r, 5000));
      }
    }

    connect();
    return () => {
      closed = true;
      controller.abort();
    };
  }, [enabled]);
}
