import { Module } from "@nestjs/common";
import { PlansController } from "./plans.controller";
import { PlansService } from "./plans.service";
import { PrismaModule } from "../../prisma/prisma.module";

import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";

@Module({
  imports: [PrismaModule],
  controllers: [PlansController],
  providers: [PlansService, PlatformAdminGuard],
  exports: [PlansService],
})
export class PlansModule {}
