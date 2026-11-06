import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { isPlatformAdmin } from "../../common/utils/platform-admin";

@Controller("roles")
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private roles: RolesService) {}

  @Get()
  async findAll(@CurrentUser() user: { role: string; permissions?: { module: string; function: string }[] }, @Query("companyId") companyId?: string) {
    const list = await this.roles.findAll(companyId === "null" ? null : companyId);
    if (isPlatformAdmin(user)) return list;
    return list.filter((r) => r.slug !== "SUPER_ADMIN");
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.roles.findOne(id);
  }

  @Post()
  create(@Body() body: Parameters<RolesService["create"]>[0]) {
    return this.roles.create(body);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: Parameters<RolesService["update"]>[1]) {
    return this.roles.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.roles.remove(id);
  }
}
