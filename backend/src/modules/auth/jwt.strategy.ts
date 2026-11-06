import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";

export type JwtPayload = {
  sub: string;
  type?: "motorista" | "user";
  companyId?: string;
  motoristaId?: string;
  nome?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private auth: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get("JWT_SECRET") || "dev-secret-change-in-prod",
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === "motorista") {
      return {
        id: payload.sub,
        motoristaId: payload.motoristaId ?? payload.sub,
        companyId: payload.companyId,
        type: "motorista",
        name: payload.nome,
      };
    }
    const user = await this.auth.validateUser(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
