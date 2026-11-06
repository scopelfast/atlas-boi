import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas Boi — App Motorista",
    short_name: "Motorista",
    description: "Viagens, despesas com OCR e saldo da conta corrente",
    start_url: "/motorista/viagens",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#059669",
    icons: [
      {
        src: "/logomarca/atlas-boi-retangular.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
