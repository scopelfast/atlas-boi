import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      success: true,
      message: "Atlas Boi API operacional",
      data: {
        service: "atlas-boi-api",
        version: "0.1.0",
        phase: "2",
      },
    };
  }
}
