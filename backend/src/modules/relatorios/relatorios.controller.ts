import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RelatoriosService } from "./relatorios.service";

@Controller("relatorios")
@UseGuards(JwtAuthGuard)
export class RelatoriosController {
  constructor(private relatorios: RelatoriosService) {}

  @Get("dre-veiculo")
  getDreVeiculo(
    @CurrentUser("companyId") companyId: string,
    @Query("competencia") competencia?: string,
    @Query("veiculoId") veiculoId?: string
  ) {
    return this.relatorios.getDreVeiculo(companyId, { competencia, veiculoId });
  }

  @Get("dre-consolidado")
  getDreConsolidado(
    @CurrentUser("companyId") companyId: string,
    @Query("competencia") competencia?: string
  ) {
    return this.relatorios.getDreConsolidado(companyId, competencia);
  }

  @Get("ranking-rotas")
  getRankingRotas(@CurrentUser("companyId") companyId: string) {
    return this.relatorios.getRankingRotas(companyId);
  }

  @Get("ranking-motoristas")
  getRankingMotoristas(@CurrentUser("companyId") companyId: string) {
    return this.relatorios.getRankingMotoristas(companyId);
  }

  @Post("refresh-dre")
  refreshDre() {
    return this.relatorios.refreshDreVeiculo();
  }

  @Get("dre-competencias")
  getDreCompetencias(
    @CurrentUser("companyId") companyId: string,
    @Query("veiculoId") veiculoId?: string
  ) {
    return this.relatorios.getDreCompetencias(companyId, veiculoId);
  }
}
