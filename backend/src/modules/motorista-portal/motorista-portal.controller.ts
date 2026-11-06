import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MotoristaJwtGuard } from "../../common/guards/motorista-jwt.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { MotoristaPortalService } from "./motorista-portal.service";

@Controller("motorista")
@UseGuards(JwtAuthGuard, MotoristaJwtGuard)
export class MotoristaPortalController {
  constructor(private portal: MotoristaPortalService) {}

  @Get("push/vapid-key")
  pushPublicKey() {
    return this.portal.pushPublicKey();
  }

  @Post("push/subscribe")
  pushSubscribe(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Body()
    body: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }
  ) {
    return this.portal.pushSubscribe(companyId, motoristaId!, body);
  }

  @Post("push/unsubscribe")
  pushUnsubscribe(
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Body() body: { endpoint: string }
  ) {
    return this.portal.pushUnsubscribe(motoristaId!, body.endpoint);
  }

  @Post("push/test")
  pushTest(@CurrentUser("motoristaId") motoristaId: string | undefined) {
    return this.portal.pushTest(motoristaId!);
  }

  @Get("viagens")
  viagens(@CurrentUser("companyId") companyId: string, @CurrentUser("motoristaId") motoristaId?: string) {
    return this.portal.viagens(companyId, motoristaId!);
  }

  @Get("viagens/:id")
  viagemDetalhe(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Param("id") id: string
  ) {
    return this.portal.viagemDetalhe(companyId, motoristaId!, id);
  }

  @Post("viagens/:id/avancar-status")
  avancarStatus(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Param("id") id: string
  ) {
    return this.portal.avancarStatus(companyId, motoristaId!, id);
  }

  @Post("viagens/:id/fotos")
  @UseInterceptors(FileInterceptor("foto"))
  async enviarFoto(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Param("id") id: string,
    @Body() body: { momento?: string; observacao?: string },
    @UploadedFile() foto?: { buffer: Buffer; originalname?: string }
  ) {
    return this.portal.enviarFotoCarga(companyId, motoristaId!, id, {
      momento: body.momento,
      observacao: body.observacao,
      foto: foto?.buffer ?? Buffer.alloc(0),
      fotoNome: foto?.originalname,
    });
  }

  @Get("viagens/:id/fotos/:fotoId")
  async arquivoFoto(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Param("id") id: string,
    @Param("fotoId") fotoId: string
  ) {
    const file = await this.portal.obterArquivoFoto(companyId, motoristaId!, id, fotoId);
    return new StreamableFile(file.stream, {
      type: file.mime,
      disposition: `inline; filename="${file.nome}"`,
    });
  }

  @Get("viagens/:id/prestacao-contas")
  prestacaoContas(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Param("id") id: string
  ) {
    return this.portal.prestacaoContas(companyId, motoristaId!, id);
  }

  @Post("viagens/:id/prestacao-contas/fechar")
  fecharPrestacaoContas(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Param("id") id: string
  ) {
    return this.portal.fecharPrestacaoContas(companyId, motoristaId!, id);
  }

  @Get("saldo")
  saldo(@CurrentUser("companyId") companyId: string, @CurrentUser("motoristaId") motoristaId?: string) {
    return this.portal.saldo(companyId, motoristaId!);
  }

  @Get("despesas")
  listarDespesas(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId?: string
  ) {
    return this.portal.listarDespesas(companyId, motoristaId!);
  }

  @Post("despesas")
  @UseInterceptors(FileInterceptor("foto"))
  async despesa(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Body()
    body: {
      valor: string;
      descricao?: string;
      observacoes?: string;
      carregamentoId?: string;
      veiculoId?: string;
      categoriaCusto?: string;
      formaPagamento?: "ADIANTAMENTO" | "DO_BOLSO";
    },
    @UploadedFile() foto?: { buffer: Buffer; originalname?: string }
  ) {
    const cat = body.categoriaCusto?.toUpperCase();
    return this.portal.registrarDespesa(companyId, motoristaId!, {
      valor: Number(body.valor),
      descricao: body.descricao,
      observacoes: body.observacoes,
      carregamentoId: body.carregamentoId,
      veiculoId: body.veiculoId,
      categoriaCusto:
        cat && ["COMBUSTIVEL", "MANUTENCAO", "PNEU", "MULTA"].includes(cat)
          ? (cat as "COMBUSTIVEL" | "MANUTENCAO" | "PNEU" | "MULTA")
          : undefined,
      formaPagamento: body.formaPagamento,
      foto: foto?.buffer,
      fotoNome: foto?.originalname,
    });
  }

  @Patch("despesas/:id")
  atualizarDespesa(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Param("id") id: string,
    @Body() body: { valor?: number; descricao?: string; observacoes?: string }
  ) {
    return this.portal.atualizarDespesa(companyId, motoristaId!, id, body);
  }

  @Delete("despesas/:id")
  excluirDespesa(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("motoristaId") motoristaId: string | undefined,
    @Param("id") id: string
  ) {
    return this.portal.excluirDespesa(companyId, motoristaId!, id);
  }
}
