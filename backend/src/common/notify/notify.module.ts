import { Global, Module } from "@nestjs/common";
import { DashboardEventsService } from "./dashboard-events.service";

@Global()
@Module({
  providers: [DashboardEventsService],
  exports: [DashboardEventsService],
})
export class NotifyModule {}
