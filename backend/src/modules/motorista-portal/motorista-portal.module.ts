import { Module, forwardRef } from "@nestjs/common";
import { MotoristaPortalController } from "./motorista-portal.controller";
import { MotoristaPortalService } from "./motorista-portal.service";
import { FinanceiroModule } from "../financeiro/financeiro.module";
import { IntelligenceModule } from "../intelligence/intelligence.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CarregamentosModule } from "../carregamentos/carregamentos.module";

@Module({
  imports: [
    forwardRef(() => FinanceiroModule),
    forwardRef(() => CarregamentosModule),
    IntelligenceModule,
    NotificationsModule,
  ],
  controllers: [MotoristaPortalController],
  providers: [MotoristaPortalService],
})
export class MotoristaPortalModule {}
