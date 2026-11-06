import { Global, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Subject, filter, map } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";

export type DashboardEvent = {
  companyId: string;
  type: "carregamento_updated" | "kpis_refresh";
  carregamentoId?: string;
  status?: string;
  at: string;
};

const CHANNEL = "atlas_boi_dashboard";

@Injectable()
export class DashboardEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DashboardEventsService.name);
  private readonly bus = new Subject<DashboardEvent>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pgClient: any = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>("DATABASE_URL");
    if (!url) return;
    try {
      const { Client } = await import("pg");
      this.pgClient = new Client({ connectionString: url });
      await this.pgClient.connect();
      await this.pgClient.query(`LISTEN ${CHANNEL}`);
      this.pgClient.on("notification", (msg: { payload?: string }) => {
        if (!msg.payload) return;
        try {
          const ev = JSON.parse(msg.payload) as DashboardEvent;
          this.bus.next(ev);
        } catch {
          /* ignore */
        }
      });
      this.logger.log(`LISTEN ${CHANNEL} ativo`);
    } catch (e) {
      this.logger.warn(`LISTEN/NOTIFY indisponível — SSE local apenas: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.pgClient?.end();
    } catch {
      /* ignore */
    }
  }

  stream(companyId: string) {
    return this.bus.pipe(
      filter((e) => e.companyId === companyId),
      map((e) => ({ data: e }))
    );
  }

  async emit(event: Omit<DashboardEvent, "at">) {
    const full: DashboardEvent = { ...event, at: new Date().toISOString() };
    this.bus.next(full);
    try {
      await this.prisma.$executeRaw`SELECT pg_notify(${CHANNEL}, ${JSON.stringify(full)})`;
    } catch {
      /* pg_notify opcional */
    }
  }
}