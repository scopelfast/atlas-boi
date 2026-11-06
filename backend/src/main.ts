import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  app.enableCors({
    origin: true,
    credentials: true,
  });
  const port = Number(process.env.PORT) || 3004;
  const host = process.env.HOST || "0.0.0.0";
  await app.listen(port, host);
  console.log(`API rodando em http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
}
bootstrap();
