import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { PrismaModule } from "../../prisma/prisma.module";

import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";

@Module({
  imports: [PrismaModule],
  controllers: [CatalogController],
  providers: [CatalogService, PlatformAdminGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
