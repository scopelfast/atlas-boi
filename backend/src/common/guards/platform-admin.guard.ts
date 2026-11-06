import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { isPlatformAdmin } from "../utils/platform-admin";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!isPlatformAdmin(user)) {
      throw new ForbiddenException("Acesso restrito à operadora da plataforma Atlas Boi");
    }
    return true;
  }
}
