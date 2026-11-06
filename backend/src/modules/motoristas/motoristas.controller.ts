import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { MotoristasService } from "./motoristas.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("motoristas")
@UseGuards(JwtAuthGuard)
export class MotoristasController {
  constructor(private motoristas: MotoristasService) {}

  @Get()
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string
  ) {
    return this.motoristas.findAll(companyId, page ? Number(page) : 1, limit ? Number(limit) : 20, search);
  }

  @Get(":id")
  findOne(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.motoristas.findOne(id, companyId);
  }

  @Post()
  create(@CurrentUser("companyId") companyId: string, @Body() body: Parameters<MotoristasService["create"]>[1]) {
    return this.motoristas.create(companyId, body);
  }

  @Put(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() body: Parameters<MotoristasService["update"]>[2]
  ) {
    return this.motoristas.update(id, companyId, body);
  }

  @Delete(":id")
  remove(@CurrentUser("companyId") companyId: string, @Param("id") id: string) {
    return this.motoristas.remove(id, companyId);
  }
}
