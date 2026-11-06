import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { CarregamentoStatus } from "@prisma/client";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CarregamentosService } from "./carregamentos.service";

@Controller("carregamentos")
@UseGuards(JwtAuthGuard)
export class CarregamentosController {
  constructor(private carregamentos: CarregamentosService) {}

  @Get()
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: CarregamentoStatus
  ) {
    return this.carregamentos.findAll(
      companyId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
      status
    );
  }

  @Post("import-nfe/cadastrar-clientes")
  cadastrarClientesNfe(
    @CurrentUser("companyId") companyId: string,
    @Body() body: { xml: string; cadastrarOrigem?: boolean; cadastrarDestino?: boolean }
  ) {
    if (!body.xml?.trim()) {
      throw new BadRequestException("XML da NF-e é obrigatório");
    }
    return this.carregamentos.cadastrarClientesFromNfe(companyId, body.xml, {
      cadastrarOrigem: body.cadastrarOrigem !== false,
      cadastrarDestino: body.cadastrarDestino !== false,
    });
  }

  @Post("import-nfe")
  @UseInterceptors(FileInterceptor("file"))
  async importNfe(
    @CurrentUser("companyId") companyId: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string },
    @Body("xml") xmlBody?: string,
    @Body("cadastrarClientes") cadastrarClientes?: string
  ) {
    const xml = file?.buffer?.toString("utf-8") ?? xmlBody;
    if (!xml?.trim()) {
      throw new BadRequestException("Envie o arquivo XML da NF-e");
    }
    const autoCadastro =
      cadastrarClientes === "true" || cadastrarClientes === "1" || cadastrarClientes === "on";
    return this.carregamentos.importNfePreview(companyId, xml, {
      cadastrarClientes: autoCadastro,
    });
  }

  @Post(":id/notas-fiscais")
  @UseInterceptors(FileInterceptor("file"))
  async addNotaFiscal(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string },
    @Body("xml") xmlBody?: string
  ) {
    const xml = file?.buffer?.toString("utf-8") ?? xmlBody;
    if (!xml?.trim()) {
      throw new BadRequestException("Envie o arquivo XML da NF-e");
    }
    return this.carregamentos.addNotaFiscal(id, companyId, userId, xml);
  }

  @Delete(":id/notas-fiscais/:notaId")
  removeNotaFiscal(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Param("notaId") notaId: string
  ) {
    return this.carregamentos.removeNotaFiscal(id, notaId, companyId, userId);
  }

  @Put(":id/notas-fiscais/:notaId/papel")
  updateNotaPapel(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Param("notaId") notaId: string,
    @Body("papel") papel: "PRINCIPAL" | "TROCA"
  ) {
    if (papel !== "PRINCIPAL" && papel !== "TROCA") {
      throw new BadRequestException("papel deve ser PRINCIPAL ou TROCA");
    }
    return this.carregamentos.updateNotaPapel(id, notaId, companyId, userId, papel);
  }

  @Post(":id/minuta-foto")
  @UseInterceptors(FileInterceptor("file"))
  uploadMinutaFoto(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype?: string }
  ) {
    if (!file) {
      throw new BadRequestException("Envie uma foto da minuta");
    }
    return this.carregamentos.uploadMinutaFoto(id, companyId, userId, file);
  }

  @Get(":id/minuta-foto")
  async getMinutaFoto(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const file = await this.carregamentos.getMinutaFotoFile(id, companyId);
    res.set({
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="${file.nome.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    });
    return new StreamableFile(file.stream);
  }

  @Delete(":id/minuta-foto")
  removeMinutaFoto(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string
  ) {
    return this.carregamentos.removeMinutaFoto(id, companyId, userId);
  }

  @Get(":id/fotos-carga")
  listarFotosCarga(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string
  ) {
    return this.carregamentos.listarFotosCarga(id, companyId);
  }

  @Get(":id/fotos-carga/:fotoId")
  async getFotoCarga(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Param("fotoId") fotoId: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const file = await this.carregamentos.getFotoCargaFile(id, fotoId, companyId);
    res.set({
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="${file.nome.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    });
    return new StreamableFile(file.stream);
  }

  @Delete(":id/fotos-carga/:fotoId")
  removeFotoCarga(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Param("fotoId") fotoId: string
  ) {
    return this.carregamentos.removeFotoCarga(id, fotoId, companyId, userId);
  }

  @Get(":id/eventos")
  findEventos(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.carregamentos.findEventos(id, companyId);
  }

  @Get(":id")
  findOne(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.carregamentos.findOne(id, companyId);
  }

  @Post()
  create(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Body() body: Parameters<CarregamentosService["create"]>[2]
  ) {
    return this.carregamentos.create(companyId, userId, body);
  }

  @Put(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() body: Parameters<CarregamentosService["update"]>[3]
  ) {
    return this.carregamentos.update(id, companyId, userId, body);
  }

  @Delete(":id/nfe")
  removeNfe(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string
  ) {
    return this.carregamentos.removeNfe(id, companyId, userId);
  }

  @Delete(":id")
  remove(
    @CurrentUser("companyId") companyId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string
  ) {
    return this.carregamentos.remove(id, companyId, userId);
  }
}
