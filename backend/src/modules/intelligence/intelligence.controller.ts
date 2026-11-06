import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { IntelligenceService } from "./intelligence.service";

@Controller("intelligence")
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
  constructor(private intelligence: IntelligenceService) {}

  @Get("status")
  getStatus() {
    return this.intelligence.getStatus();
  }

  @Get("alertas")
  getAlertas(@CurrentUser("companyId") companyId: string) {
    return this.intelligence.getOpsAlertas(companyId);
  }

  @Get("rota-brain/:rotaId")
  rotaBrain(@CurrentUser("companyId") companyId: string, @Param("rotaId") rotaId: string) {
    return this.intelligence.sugerirRota(companyId, rotaId);
  }

  @Get("rota-brain")
  rotasSubprecificadas(@CurrentUser("companyId") companyId: string) {
    return this.intelligence.listarRotasSubprecificadas(companyId);
  }

  @Get("exemplos")
  getExemplos() {
    return { perguntas: this.intelligence.getExemplosPerguntas() };
  }

  @Post("perguntar")
  perguntar(
    @CurrentUser("companyId") companyId: string,
    @Body() body: { pergunta: string }
  ) {
    return this.intelligence.perguntar(companyId, body.pergunta ?? "");
  }

  @Post("nfe-analyze")
  analyzeNfe(
    @CurrentUser("companyId") companyId: string,
    @Body() body: { xml: string; carregamentoId?: string }
  ) {
    return this.intelligence.analyzeNfeXml(companyId, body.xml ?? "", body.carregamentoId);
  }

  @Post("snapshot-kpis")
  snapshotKpis(@CurrentUser("companyId") companyId: string) {
    return this.intelligence.snapshotKpis(companyId);
  }

  @Post("ocr-comprovante")
  @UseInterceptors(FileInterceptor("foto"))
  async ocrComprovante(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Envie uma imagem do comprovante");
    }
    return this.intelligence.analyzeComprovante(file.buffer);
  }
}
