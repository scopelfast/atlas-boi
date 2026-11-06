"use client";

import { useEffect, useRef } from "react";
import type { MotoristaLocal } from "@/services/api";

function coords(local: MotoristaLocal): [number, number] | null {
  const lat = local.latitude != null ? Number(local.latitude) : NaN;
  const lng = local.longitude != null ? Number(local.longitude) : NaN;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
}

type Props = {
  origem: MotoristaLocal;
  destino: MotoristaLocal;
  className?: string;
};

/** Prévia com origem + destino (Leaflet/OSM). Sem API key. */
export function MotoristaRotaMap({ origem, destino, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const o = coords(origem);
    const d = coords(destino);
    if (!containerRef.current || (!o && !d)) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      // Evita ícones quebrados do default do Leaflet no bundler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const el = containerRef.current;
      el.innerHTML = "";
      map = L.map(el, { zoomControl: true, attributionControl: true });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 18,
      }).addTo(map);

      const points: [number, number][] = [];
      if (o) {
        points.push(o);
        L.circleMarker(o, {
          radius: 9,
          color: "#059669",
          weight: 2,
          fillColor: "#34d399",
          fillOpacity: 0.95,
        })
          .bindPopup(`Carregamento<br/><strong>${origem.cidade}/${origem.uf}</strong>`)
          .addTo(map);
      }
      if (d) {
        points.push(d);
        L.circleMarker(d, {
          radius: 9,
          color: "#d97706",
          weight: 2,
          fillColor: "#fbbf24",
          fillOpacity: 0.95,
        })
          .bindPopup(`Descarga<br/><strong>${destino.cidade}/${destino.uf}</strong>`)
          .addTo(map);
      }
      if (o && d) {
        L.polyline([o, d], {
          color: "#34d399",
          weight: 3,
          opacity: 0.75,
          dashArray: "6 8",
        }).addTo(map);
      }

      if (points.length === 2) {
        map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 11 });
      } else {
        map.setView(points[0], 11);
      }

      // Leaflet precisa recalcular tamanho após layout
      requestAnimationFrame(() => map?.invalidateSize());
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [origem, destino]);

  const oOk = coords(origem);
  const dOk = coords(destino);
  if (!oOk && !dOk) return null;

  return (
    <div className={className}>
      <div ref={containerRef} className="h-44 w-full bg-black/40" />
      <div className="flex flex-wrap gap-3 border-t border-white/10 px-3 py-2 text-[10px] text-white/50">
        {oOk && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Carregamento
          </span>
        )}
        {dOk && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Descarga
          </span>
        )}
        {!oOk || !dOk ? (
          <span className="text-white/35">Cadastre GPS no cliente sem ponto para ver os dois.</span>
        ) : null}
      </div>
    </div>
  );
}
