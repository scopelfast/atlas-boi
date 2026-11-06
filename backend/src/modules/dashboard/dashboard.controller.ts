import { Controller, Get, Sse, UseGuards } from "@nestjs/common";
import { Observable } from "rxjs";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { DashboardService } from "./dashboard.service";
import { DashboardEventsService } from "../../common/notify/dashboard-events.service";

@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private dashboard: DashboardService,
    private events: DashboardEventsService
  ) {}

  @Get("kpis")
  getKpis(@CurrentUser("companyId") companyId: string) {
    return this.dashboard.getKpis(companyId);
  }

  @Sse("events")
  stream(@CurrentUser("companyId") companyId: string): Observable<{ data: unknown }> {
    return this.events.stream(companyId);
  }
}
