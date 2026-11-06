import { Module } from "@nestjs/common";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";

@Module({
  imports: [PrismaModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, PlatformAdminGuard],
  exports: [CompaniesService],
})
export class CompaniesModule {}
