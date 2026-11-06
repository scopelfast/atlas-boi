import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ClientesService } from "./clientes.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ClienteTipo } from "@prisma/client";

@Controller("clientes")
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private clientes: ClientesService) {}

  @Get()
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("tipo") tipo?: ClienteTipo
  ) {
    return this.clientes.findAll(
      companyId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
      tipo
    );
  }

  @Get(":id")
  findOne(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.clientes.findOne(id, companyId);
  }

  @Post()
  create(@CurrentUser("companyId") companyId: string, @Body() body: Parameters<ClientesService["create"]>[1]) {
    return this.clientes.create(companyId, body);
  }

  @Put(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() body: Parameters<ClientesService["update"]>[2]
  ) {
    return this.clientes.update(id, companyId, body);
  }

  @Delete(":id")
  remove(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.clientes.remove(id, companyId);
  }
}
