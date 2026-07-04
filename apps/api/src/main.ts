import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { PrismaService } from "./modules/prisma/prisma.service";
import { seedAuth } from "./modules/auth/auth.seed";

async function bootstrap() {
  (BigInt.prototype as any).toJSON = function () {
    const num = Number(this);
    return Number.isSafeInteger(num) ? num : this.toString();
  };

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const port = config.get<number>("APP_PORT", 4000);

  app.useBodyParser("json", { limit: "16mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "16mb" });
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: true,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("SchoolSaaS BF API")
    .setDescription("API locale pour le MVP de gestion scolaire hybride.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  // Seed automatique au démarrage : permissions, rôles système, super admin
  const prisma = app.get(PrismaService);
  await seedAuth(prisma as any, config);

  await app.listen(port);
  console.log(`[SchoolSaaS] API démarrée sur le port ${port}`);
}

void bootstrap();
