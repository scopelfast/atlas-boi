import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { RotasService } from "./rotas.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("rotas")
@UseGuards(JwtAuthGuard)
export class RotasController {
  constructor(private rotas: RotasService) {}

  @Get()
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string
  ) {
    return this.rotas.findAll(companyId, page ? Number(page) : 1, limit ? Number(limit) : 20, search);
  }

  @Get(":id")
  findOne(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.rotas.findOne(id, companyId);
  }

  @Post()
  create(@CurrentUser("companyId") companyId: string, @Body() body: Parameters<RotasService["create"]>[1]) {
    return this.rotas.create(companyId, body);
  }

  @Put(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() body: Parameters<RotasService["update"]>[2]
  ) {
    return this.rotas.update(id, companyId, body);
  }

  @Delete(":id")
  remove(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.rotas.remove(id, companyId);
  }
}
