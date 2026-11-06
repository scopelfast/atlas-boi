import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const ip = request.ip || request.connection?.remoteAddress;
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(async () => {
        if (userId) {
          await this.prisma.log
            .create({
              data: {
                userId,
                module: url.split("/")[2] || "unknown",
                action: `${method} ${url}`,
                detail: `${method} ${url}`,
                ip,
              },
            })
            .catch(() => {});
        }
      })
    );
  }
}
