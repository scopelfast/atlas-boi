import { cn } from "@/utils/cn";

type AtlasBoiMarkProps = {
  className?: string;
  /** Tamanho do ícone em px (padrão 44) */
  size?: number;
};

/**
 * Marca do app motorista — carreta boiadeira (silhueta).
 * Sem rosto/chifres: evita o “capetinha” e legível em 40–80px.
 */
export function AtlasBoiMark({ className, size = 44 }: AtlasBoiMarkProps) {
  const icon = Math.round(size * 0.78);
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
        "border border-emerald-500/20 bg-gradient-to-br from-[#14532d] via-[#0c1f14] to-[#050805]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 64"
        width={icon}
        height={icon}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Solo / estrada */}
        <path
          d="M6 48h52"
          stroke="#34d399"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.35"
        />
        {/* Cabine */}
        <path
          d="M8 40V28c0-1.5 1-3 3-3h8l4 7h2v8H8z"
          fill="#1a5c2e"
          stroke="#6ee7b7"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Janela */}
        <path d="M12 28.5h5.5l2.5 4.5H12v-4.5z" fill="#0a0a0a" opacity="0.55" />
        {/* Carroceria boiadeira */}
        <rect
          x="25"
          y="22"
          width="31"
          height="18"
          rx="2"
          fill="#163d24"
          stroke="#34d399"
          strokeWidth="1.6"
        />
        {/* Grades (transporte de gado) */}
        <path d="M31 25v12M37 25v12M43 25v12M49 25v12" stroke="#6ee7b7" strokeWidth="1.2" opacity="0.55" />
        <path d="M28 31h25" stroke="#6ee7b7" strokeWidth="1" opacity="0.4" />
        {/* Rodas */}
        <circle cx="14" cy="44" r="4" fill="#0a0a0a" stroke="#a7f3d0" strokeWidth="1.4" />
        <circle cx="14" cy="44" r="1.4" fill="#34d399" opacity="0.8" />
        <circle cx="34" cy="44" r="4" fill="#0a0a0a" stroke="#a7f3d0" strokeWidth="1.4" />
        <circle cx="34" cy="44" r="1.4" fill="#34d399" opacity="0.8" />
        <circle cx="48" cy="44" r="4" fill="#0a0a0a" stroke="#a7f3d0" strokeWidth="1.4" />
        <circle cx="48" cy="44" r="1.4" fill="#34d399" opacity="0.8" />
        {/* Detalhe dourado — Atlas */}
        <path d="M27 19h10" stroke="#c9a227" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      </svg>
    </div>
  );
}
