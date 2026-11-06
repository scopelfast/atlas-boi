import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as webpush from "web-push";
import { PrismaService } from "../../prisma/prisma.service";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);
  private ready = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {
    const publicKey = this.config.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.config.get<string>("VAPID_PRIVATE_KEY");
    const subject = this.config.get<string>("VAPID_SUBJECT") || "mailto:ops@atlasboi.local";
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.ready = true;
    } else {
      this.log.warn("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ausentes — push desabilitado");
    }
  }

  isEnabled() {
    return this.ready;
  }

  getPublicKey() {
    return this.config.get<string>("VAPID_PUBLIC_KEY") || null;
  }

  async subscribe(
    companyId: string,
    motoristaId: string,
    input: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }
  ) {
    if (!input.endpoint || !input.keys?.p256dh || !input.keys?.auth) {
      throw new Error("Subscription inválida");
    }
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        companyId,
        motoristaId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent || null,
      },
      update: {
        companyId,
        motoristaId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent || null,
      },
    });
  }

  async unsubscribe(motoristaId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { motoristaId, endpoint },
    });
    return { success: true };
  }

  async notifyMotorista(motoristaId: string, payload: PushPayload) {
    if (!this.ready) return { sent: 0, skipped: true };
    const subs = await this.prisma.pushSubscription.findMany({ where: { motoristaId } });
    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
        sent++;
      } catch (e: unknown) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        } else {
          this.log.warn(`Falha push ${sub.id}: ${String(e)}`);
        }
      }
    }
    return { sent, skipped: false };
  }

  async notifyMotoristasDoCarregamento(
    companyId: string,
    carregamentoId: string,
    payload: PushPayload
  ) {
    const vínculos = await this.prisma.carregamentoMotorista.findMany({
      where: { carregamentoId, carregamento: { companyId } },
      select: { motoristaId: true },
    });
    let total = 0;
    for (const v of vínculos) {
      const r = await this.notifyMotorista(v.motoristaId, payload);
      total += r.sent;
    }
    return { sent: total };
  }
}
