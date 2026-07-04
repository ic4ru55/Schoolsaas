import { Module } from "@nestjs/common";
import { GradingTemplatesController } from "./grading-templates.controller";
import { GradingTemplatesService } from "./grading-templates.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [GradingTemplatesController],
  providers: [GradingTemplatesService],
  exports: [GradingTemplatesService]
})
export class GradingTemplatesModule {}
