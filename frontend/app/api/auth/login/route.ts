import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004";

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ message: "Erro ao processar resposta" }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        message:
          "Backend indisponível. Inicie o servidor em backend/ (npm run dev) na porta 3004.",
      },
      { status: 503 }
    );
  }
}
