"use client";

import dynamic from "next/dynamic";

const CarregamentosView = dynamic(
  () => import("@/components/carregamentos/carregamentos-view"),
  { ssr: false }
);

export default function CarregamentosPage() {
  return <CarregamentosView />;
}
