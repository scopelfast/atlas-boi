"use client";

import { useEffect } from "react";

function isNgrokHost() {
  if (typeof window === "undefined") return false;
  return /ngrok-free\.(dev|app)|\.ngrok\.io/i.test(window.location.hostname);
}

/**
 * Registra SW que injeta ngrok-skip-browser-warning (chunks /_next no celular).
 * Na 1ª visita após «Visit Site», recarrega uma vez para o SW controlar os assets.
 */
export function NgrokBypass() {
  useEffect(() => {
    if (!isNgrokHost() || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker
      .register("/ngrok-sw.js", { scope: "/" })
      .then(async (reg) => {
        if (cancelled) return;
        await reg.update().catch(() => {});

        const reloaded = sessionStorage.getItem("atlas-ngrok-sw-ready");
        const controlled = !!navigator.serviceWorker.controller;

        if (!reloaded && !controlled) {
          sessionStorage.setItem("atlas-ngrok-sw-ready", "1");
          window.location.reload();
        }
      })
      .catch(() => {
        /* SW opcional — ngrok pode bloquear em contextos restritos */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
