import { Injectable } from "@nestjs/common";

export type OcrComprovanteResult = {
  texto: string;
  valor?: number;
  data?: string;
  estabelecimento?: string;
  confianca: number;
};

@Injectable()
export class ComprovanteBrainService {
  async analyzeImage(buffer: Buffer): Promise<OcrComprovanteResult> {
    let texto = "";
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por");
      const { data } = await worker.recognize(buffer);
      texto = data.text ?? "";
      await worker.terminate();
    } catch {
      return { texto: "", confianca: 0 };
    }

    const valor = this.extractValor(texto);
    const data = this.extractData(texto);
    const estabelecimento = this.extractEstabelecimento(texto);

    let confianca = 0.4;
    if (valor != null) confianca += 0.3;
    if (data) confianca += 0.2;
    if (estabelecimento) confianca += 0.1;

    return { texto, valor, data, estabelecimento, confianca: Math.min(1, confianca) };
  }

  private extractValor(text: string): number | undefined {
    const matches = text.match(/R\$\s*[\d.,]+/gi) ?? [];
    const valores = matches
      .map((m) => {
        const n = m.replace(/R\$\s*/i, "").replace(/\./g, "").replace(",", ".");
        return parseFloat(n);
      })
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!valores.length) return undefined;
    return Math.max(...valores);
  }

  private extractData(text: string): string | undefined {
    const m = text.match(/\b(\d{2}[\/\-.]\d{2}[\/\-.]\d{2,4})\b/);
    return m?.[1];
  }

  private extractEstabelecimento(text: string): string | undefined {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 4 && l.length < 60);
    return lines[0];
  }
}
