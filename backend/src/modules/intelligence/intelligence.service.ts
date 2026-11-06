import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NfeBrainService } from "./nfe-brain.service";
import { OpsBrainService } from "./ops-brain.service";
import { QueryBrainService } from "./query-brain.service";
import { QueryLlmService } from "./query-llm.service";
import { ComprovanteBrainService } from "./comprovante-brain.service";
import { RotaBrainService } from "./rota-brain.service";
import { parseNfeXml } from "../carregamentos/nfe-parser";

@Injectable()
export class IntelligenceService {
  constructor(
    private prisma: PrismaService,
    private ops: OpsBrainService,
    private query: QueryBrainService,
    private nfe: NfeBrainService,
    private llm: QueryLlmService,
    private comprovante: ComprovanteBrainService,
    private rotaBrain: RotaBrainService
  ) {}

  getOpsAlertas(companyId: string) {
    return this.ops.getAlertas(companyId);
  }

  async perguntar(companyId: string, pergunta: string) {
    let result = await this.query.perguntar(companyId, pergunta);

    if (result.intencao === "desconhecida" && this.llm.enabled) {
      const templateId = await this.llm.classifyTemplate(pergunta);
      if (templateId) {
        const alt = await this.query.runByTemplateId(companyId, pergunta, templateId);
        if (alt) result = alt;
      }
    }

    if (this.llm.enabled && result.intencao !== "desconhecida") {
      const polished = await this.llm.polish(pergunta, result);
      if (polished) result = { ...result, resposta: polished };
    }

    return { ...result, llmAtivo: this.llm.enabled };
  }

  getExemplosPerguntas() {
    return this.query.getExemplos();
  }

  async analyzeNfeXml(companyId: string, xml: string, carregamentoId?: string) {
    const parsed = parseNfeXml(xml);
    return this.nfe.analyze(companyId, parsed, { carregamentoId });
  }

  async getStatus() {
    let pgCron = false;
    let ultimoSnapshot: string | null = null;
    try {
      const cronRows = await this.prisma.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname = 'pg_cron'
      `;
      pgCron = cronRows.length > 0;
    } catch {
      pgCron = false;
    }

    try {
      const snap = await this.prisma.$queryRaw<Array<{ max: Date | null }>>`
        SELECT MAX("createdAt") AS max FROM kpi_snapshot
      `;
      ultimoSnapshot = snap[0]?.max?.toISOString() ?? null;
    } catch {
      ultimoSnapshot = null;
    }

    return {
      pgCron,
      ultimoSnapshot,
      modulos: {
        opsBrain: true,
        queryBrain: true,
        nfeBrain: true,
        rotaBrain: true,
        queryLlm: this.llm.enabled,
        ocrComprovante: true,
      },
    };
  }

  sugerirRota(companyId: string, rotaId: string) {
    return this.rotaBrain.sugerir(companyId, rotaId);
  }

  listarRotasSubprecificadas(companyId: string) {
    return this.rotaBrain.listarSubprecificadas(companyId);
  }

  async analyzeComprovante(buffer: Buffer) {
    return this.comprovante.analyzeImage(buffer);
  }

  async snapshotKpis(companyId: string) {
    const competencia = new Date();
    competencia.setUTCDate(1);
    competencia.setUTCHours(0, 0, 0, 0);

    const [dre, alertas] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ receita: Prisma.Decimal; custo: Prisma.Decimal; resultado: Prisma.Decimal }>
      >(Prisma.sql`
        SELECT SUM(receita) AS receita, SUM(custo) AS custo, SUM(resultado) AS resultado
          FROM mv_dre_veiculo
         WHERE "companyId" = ${companyId}
           AND competencia = ${competencia}
      `),
      this.ops.getAlertas(companyId),
    ]);

    const row = dre[0];
    const payload = {
      receita: Number(row?.receita ?? 0),
      custo: Number(row?.custo ?? 0),
      resultado: Number(row?.resultado ?? 0),
      alertasCriticos: alertas.filter((a) => a.severidade === "critical").length,
      alertasTotal: alertas.length,
      capturadoEm: new Date().toISOString(),
    };

    await this.prisma.$executeRaw`
      INSERT INTO kpi_snapshot (id, "companyId", competencia, payload, "createdAt")
      VALUES (
        ${`kpi_${companyId}_${competencia.toISOString().slice(0, 7)}`},
        ${companyId},
        ${competencia},
        ${JSON.stringify(payload)}::jsonb,
        NOW()
      )
      ON CONFLICT ("companyId", competencia)
      DO UPDATE SET payload = EXCLUDED.payload, "createdAt" = NOW()
    `;

    return { ok: true, competencia: competencia.toISOString(), payload };
  }
}
