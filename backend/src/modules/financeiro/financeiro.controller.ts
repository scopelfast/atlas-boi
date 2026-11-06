import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { LancamentoStatus, LancamentoTipo } from "@prisma/client";
import type { Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { FinanceiroService } from "./financeiro.service";

@Controller("financeiro")
@UseGuards(JwtAuthGuard)
export class FinanceiroController {
  constructor(private financeiro: FinanceiroService) {}

  @Get("lancamentos")
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("tipo") tipo?: LancamentoTipo,
    @Query("status") status?: LancamentoStatus,
    @Query("motoristaId") motoristaId?: string,
    @Query("carregamentoId") carregamentoId?: string,
    @Query("clienteId") clienteId?: string,
    @Query("veiculoId") veiculoId?: string,
    @Query("entidade") entidade?: "motorista" | "cliente" | "veiculo"
  ) {
    return this.financeiro.findAll(companyId, page ? Number(page) : 1, limit ? Number(limit) : 20, {
      search,
      tipo,
      status,
      motoristaId,
      carregamentoId,
      clienteId,
      veiculoId,
      entidade,
    });
  }

  @Get("lancamentos/:id")
  findOne(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.financeiro.findOne(id, companyId);
  }

  @Post("lancamentos")
  create(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Body() body: Parameters<FinanceiroService["create"]>[2]
  ) {
    return this.financeiro.create(companyId, userId, body);
  }

  @Put("lancamentos/:id/status")
  updateStatus(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body("status") status: LancamentoStatus
  ) {
    return this.financeiro.updateStatus(id, companyId, status);
  }

  @Post("lancamentos/:id/comprovante")
  @UseInterceptors(FileInterceptor("file"))
  uploadComprovante(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string }
  ) {
    if (!file) throw new BadRequestException("Envie um arquivo de comprovante");
    return this.financeiro.uploadComprovante(id, companyId, file);
  }

  @Get("lancamentos/:id/comprovante")
  async getComprovante(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const file = await this.financeiro.getComprovanteFile(id, companyId);
    res.set({
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="${file.nome.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    });
    return new StreamableFile(file.stream);
  }

  @Get("motoristas/saldos")
  saldosMotoristas(@CurrentUser("companyId") companyId: string) {
    return this.financeiro.saldosMotoristas(companyId);
  }

  @Get("motoristas/:id/saldo")
  saldoMotorista(
    @CurrentUser("companyId") companyId: string,
    @Param("id") motoristaId: string
  ) {
    return this.financeiro.saldoMotorista(companyId, motoristaId);
  }

  @Get("motoristas/:id/extrato")
  extratoMotorista(
    @CurrentUser("companyId") companyId: string,
    @Param("id") motoristaId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.financeiro.extratoMotorista(
      companyId,
      motoristaId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50
    );
  }

  @Get("posicao")
  posicaoFinanceira(@CurrentUser("companyId") companyId: string) {
    if (!companyId) {
      throw new BadRequestException("Empresa não vinculada ao usuário");
    }
    return this.financeiro.getPosicaoFinanceira(companyId);
  }

  @Get("clientes/saldos")
  saldosClientes(@CurrentUser("companyId") companyId: string) {
    return this.financeiro.saldosClientes(companyId);
  }

  @Get("clientes/:id/saldo")
  saldoCliente(
    @CurrentUser("companyId") companyId: string,
    @Param("id") clienteId: string
  ) {
    return this.financeiro.saldoCliente(companyId, clienteId);
  }

  @Get("clientes/:id/extrato")
  extratoCliente(
    @CurrentUser("companyId") companyId: string,
    @Param("id") clienteId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.financeiro.extratoCliente(
      companyId,
      clienteId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50
    );
  }

  @Post("clientes/:id/recebimentos")
  registrarRecebimento(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") clienteId: string,
    @Body() body: Omit<Parameters<FinanceiroService["registrarRecebimento"]>[2], "clienteId">
  ) {
    return this.financeiro.registrarRecebimento(companyId, userId, { ...body, clienteId });
  }

  @Get("veiculos/custos")
  custosVeiculos(@CurrentUser("companyId") companyId: string) {
    return this.financeiro.custosVeiculos(companyId);
  }

  @Get("veiculos/:id/custo")
  custoVeiculo(
    @CurrentUser("companyId") companyId: string,
    @Param("id") veiculoId: string
  ) {
    return this.financeiro.custoVeiculo(companyId, veiculoId);
  }

  @Get("veiculos/:id/extrato")
  extratoVeiculo(
    @CurrentUser("companyId") companyId: string,
    @Param("id") veiculoId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.financeiro.extratoVeiculo(
      companyId,
      veiculoId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50
    );
  }

  @Post("carregamentos/:id/apurar")
  apurarCarregamento(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") carregamentoId: string
  ) {
    return this.financeiro.apurarCarregamento(carregamentoId, companyId, userId);
  }

  @Get("carregamentos/:id/preview-apuracao")
  previewApuracao(
    @CurrentUser("companyId") companyId: string,
    @Param("id") carregamentoId: string
  ) {
    return this.financeiro.previewApuracao(carregamentoId, companyId);
  }

  @Put("carregamentos/:id/descontos")
  atualizarDescontos(
    @CurrentUser("companyId") companyId: string,
    @Param("id") carregamentoId: string,
    @Body() body: Parameters<FinanceiroService["atualizarDescontos"]>[2]
  ) {
    return this.financeiro.atualizarDescontos(carregamentoId, companyId, body);
  }

  @Get("carregamentos/:id/lancamentos")
  lancamentosCarregamento(
    @CurrentUser("companyId") companyId: string,
    @Param("id") carregamentoId: string
  ) {
    return this.financeiro.lancamentosCarregamento(carregamentoId, companyId);
  }

  @Get("carregamentos/:id/termo-quitacao")
  termoQuitacao(
    @CurrentUser("companyId") companyId: string,
    @Param("id") carregamentoId: string
  ) {
    return this.financeiro.getTermoQuitacao(carregamentoId, companyId);
  }

  @Get("carregamentos/:id/fechamento-financeiro")
  checklistFechamento(
    @CurrentUser("companyId") companyId: string,
    @Param("id") carregamentoId: string
  ) {
    return this.financeiro.checklistFechamento(carregamentoId, companyId);
  }

  @Post("carregamentos/:id/fechamento-financeiro")
  fecharCarregamentoFinanceiro(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") carregamentoId: string
  ) {
    return this.financeiro.fecharCarregamentoFinanceiro(carregamentoId, companyId, userId);
  }

  @Get("carregamentos/:carregamentoId/prestacao-contas/:motoristaId")
  previewPrestacaoContas(
    @CurrentUser("companyId") companyId: string,
    @Param("carregamentoId") carregamentoId: string,
    @Param("motoristaId") motoristaId: string
  ) {
    return this.financeiro.previewPrestacaoContas(carregamentoId, motoristaId, companyId);
  }

  @Post("carregamentos/:carregamentoId/prestacao-contas/:motoristaId/fechar")
  fecharPrestacaoContas(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("carregamentoId") carregamentoId: string,
    @Param("motoristaId") motoristaId: string
  ) {
    return this.financeiro.fecharPrestacaoContas(carregamentoId, motoristaId, companyId, userId);
  }
}
