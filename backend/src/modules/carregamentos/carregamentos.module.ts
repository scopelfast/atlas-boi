import { Module, forwardRef } from "@nestjs/common";
import { CarregamentosController } from "./carregamentos.controller";
import { CarregamentosService } from "./carregamentos.service";
import { ClientesModule } from "../clientes/clientes.module";
import { FinanceiroModule } from "../financeiro/financeiro.module";
import { RotasModule } from "../rotas/rotas.module";
import { IntelligenceModule } from "../intelligence/intelligence.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    ClientesModule,
    RotasModule,
    IntelligenceModule,
    NotificationsModule,
    forwardRef(() => FinanceiroModule),
  ],
  controllers: [CarregamentosController],
  providers: [CarregamentosService],
  exports: [CarregamentosService],
})
export class CarregamentosModule {}
