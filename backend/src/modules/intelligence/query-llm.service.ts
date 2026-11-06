import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { QueryBrainResult } from "./intelligence.types";

const TEMPLATE_IDS = [
  "carregamentos-ativos",
  "animais-transito",
  "faturamento-mes",
  "motorista-saldo-negativo",
  "comissao-motorista",
  "ranking-rotas",
  "dre-consolidado",
  "a-receber",
] as const;

@Injectable()
export class QueryLlmService {
  constructor(private config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.config.get("QUERY_BRAIN_API_KEY"));
  }

  /** Classifica intenção via LLM → id de template */
  async classifyTemplate(pergunta: string): Promise<string | null> {
    if (!this.enabled) return null;

    const url =
      this.config.get<string>("QUERY_BRAIN_API_URL") ||
      "https://api.openai.com/v1/chat/completions";
    const model = this.config.get<string>("QUERY_BRAIN_MODEL") || "gpt-4o-mini";

    const system = `Você classifica perguntas sobre um ERP de transporte de gado.
Responda APENAS com um JSON: {"templateId":"..."}
Templates válidos: ${TEMPLATE_IDS.join(", ")}
Se não souber, {"templateId":null}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.get("QUERY_BRAIN_API_KEY")}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: "system", content: system },
            { role: "user", content: pergunta },
          ],
        }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(text) as { templateId?: string | null };
      if (parsed.templateId && TEMPLATE_IDS.includes(parsed.templateId as (typeof TEMPLATE_IDS)[number])) {
        return parsed.templateId;
      }
    } catch {
      return null;
    }
    return null;
  }

  /** Reformula resposta em português natural (opcional) */
  async polish(pergunta: string, base: QueryBrainResult): Promise<string | null> {
    if (!this.enabled) return null;
    const url =
      this.config.get<string>("QUERY_BRAIN_API_URL") ||
      "https://api.openai.com/v1/chat/completions";
    const model = this.config.get<string>("QUERY_BRAIN_MODEL") || "gpt-4o-mini";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.get("QUERY_BRAIN_API_KEY")}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "Reescreva a resposta de forma clara em português brasileiro, sem inventar números. Máximo 3 frases.",
            },
            {
              role: "user",
              content: `Pergunta: ${pergunta}\nDados: ${base.resposta}`,
            },
          ],
        }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return json.choices?.[0]?.message?.content?.trim() ?? null;
    } catch {
      return null;
    }
  }
}
