import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { PlansService } from "./plans.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";

@Controller("plans")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlansController {
  constructor(private plans: PlansService) {}

  @Get()
  findAll() {
    return this.plans.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.plans.findOne(id);
  }

  @Post()
  create(@Body() body: Parameters<PlansService["create"]>[0]) {
    return this.plans.create(body);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: Parameters<PlansService["update"]>[1]) {
    return this.plans.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.plans.remove(id);
  }
}
