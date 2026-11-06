import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";

@Controller("companies")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class CompaniesController {
  constructor(private companies: CompaniesService) {}

  @Get()
  findAll() {
    return this.companies.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.companies.findOne(id);
  }

  @Post()
  create(@Body() body: Parameters<CompaniesService["create"]>[0]) {
    return this.companies.create(body);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: Parameters<CompaniesService["update"]>[1]) {
    return this.companies.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.companies.remove(id);
  }
}
