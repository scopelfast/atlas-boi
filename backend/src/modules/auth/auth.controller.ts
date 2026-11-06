import { Controller, Post, Body, Get, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("login")
  async login(
    @Body("email") email: string,
    @Body("password") password: string
  ) {
    return this.auth.login(email, password);
  }

  @Post("motorista/login")
  async loginMotorista(
    @Body("cpf") cpf: string,
    @Body("password") password: string
  ) {
    return this.auth.loginMotorista(cpf, password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { id: string }) {
    const full = await this.auth.validateUser(user.id);
    if (!full) return null;
    return full;
  }
}
