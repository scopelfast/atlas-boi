import { Controller, Get, UseGuards } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";

@Controller("catalog")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class CatalogController {
  constructor(private catalog: CatalogService) {}

  @Get("modules")
  getModules() {
    return this.catalog.getModules();
  }

  @Get("functions")
  getFunctions() {
    return this.catalog.getFunctions();
  }
}
