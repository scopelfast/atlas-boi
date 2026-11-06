import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class MotoristaJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user?.type !== "motorista" || !user.motoristaId) {
      throw new UnauthorizedException("Acesso restrito ao app do motorista");
    }
    return true;
  }
}
