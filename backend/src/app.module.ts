import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { PlansModule } from "./modules/plans/plans.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { RolesModule } from "./modules/roles/roles.module";
import { UsersModule } from "./modules/users/users.module";
import { HealthModule } from "./modules/health/health.module";
import { ClientesModule } from "./modules/clientes/clientes.module";
import { RotasModule } from "./modules/rotas/rotas.module";
import { MotoristasModule } from "./modules/motoristas/motoristas.module";
import { VeiculosModule } from "./modules/veiculos/veiculos.module";
import { CarregamentosModule } from "./modules/carregamentos/carregamentos.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { FinanceiroModule } from "./modules/financeiro/financeiro.module";
import { RelatoriosModule } from "./modules/relatorios/relatorios.module";
import { IntelligenceModule } from "./modules/intelligence/intelligence.module";
import { NotifyModule } from "./common/notify/notify.module";
import { MotoristaPortalModule } from "./modules/motorista-portal/motorista-portal.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotifyModule,
    PrismaModule,
    NotificationsModule,
    AuthModule,
    CatalogModule,
    PlansModule,
    CompaniesModule,
    RolesModule,
    UsersModule,
    HealthModule,
    ClientesModule,
    RotasModule,
    MotoristasModule,
    VeiculosModule,
    CarregamentosModule,
    DashboardModule,
    FinanceiroModule,
    RelatoriosModule,
    IntelligenceModule,
    MotoristaPortalModule,
  ],
})
export class AppModule {}
