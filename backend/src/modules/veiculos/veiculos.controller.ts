import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { VeiculosService } from "./veiculos.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("veiculos")
@UseGuards(JwtAuthGuard)
export class VeiculosController {
  constructor(private veiculos: VeiculosService) {}

  @Get()
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string
  ) {
    return this.veiculos.findAll(companyId, page ? Number(page) : 1, limit ? Number(limit) : 20, search);
  }

  @Get(":id")
  findOne(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.veiculos.findOne(id, companyId);
  }

  @Post()
  create(@CurrentUser("companyId") companyId: string, @Body() body: Parameters<VeiculosService["create"]>[1]) {
    return this.veiculos.create(companyId, body);
  }

  @Put(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() body: Parameters<VeiculosService["update"]>[2]
  ) {
    return this.veiculos.update(id, companyId, body);
  }

  @Delete(":id")
  remove(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.veiculos.remove(id, companyId);
  }
}
