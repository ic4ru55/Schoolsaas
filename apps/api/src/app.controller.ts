import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("root")
@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: "SchoolSaaS BF API",
      status: "online",
      version: "0.1.0",
      message: "API locale du MVP de gestion scolaire hybride.",
      usefulUrls: {
        health: "/api/health",
        swagger: "/docs",
        establishments: "/api/establishments"
      },
      nextFunctionalStep:
        "Creer un etablissement, puis ajouter annees scolaires, classes, eleves et paiements."
    };
  }
}
