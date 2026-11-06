import Image from "next/image";
import { cn } from "@/utils/cn";

/** Logomarca oficial: atlas-boi-retangular.png (1164×611) */
export const LOGO_SRC = "/logomarca/atlas-boi-retangular.png";
export const LOGO_WIDTH = 1164;
export const LOGO_HEIGHT = 611;

type LogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  /** Largura exibida — sidebar ~256px, login ~360px */
  sizes?: string;
};

export function Logo({
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 768px) 256px, 360px",
}: LogoProps) {
  return (
    <div className={cn("relative w-full leading-none", className)}>
      <Image
        src={LOGO_SRC}
        alt="Atlas Boi — Transporte de Gado"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        sizes={sizes}
        priority={priority}
        className={cn("block h-auto w-full", imageClassName)}
      />
    </div>
  );
}
