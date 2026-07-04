import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  GradingTemplatesService,
  CreateGradingTemplateDto,
  UpdateGradingTemplateDto
} from "./grading-templates.service";

@ApiTags("grading-templates")
@Controller("establishments/:establishmentId/grading-templates")
export class GradingTemplatesController {
  constructor(private readonly service: GradingTemplatesService) {}

  /** GET /api/establishments/:id/grading-templates */
  @Get()
  findAll(@Param("establishmentId") establishmentId: string) {
    return this.service.findAll(establishmentId);
  }

  /** GET /api/establishments/:id/grading-templates/:tplId */
  @Get(":templateId")
  findOne(
    @Param("establishmentId") establishmentId: string,
    @Param("templateId") templateId: string
  ) {
    return this.service.findOne(establishmentId, templateId);
  }

  /** POST /api/establishments/:id/grading-templates */
  @Post()
  create(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CreateGradingTemplateDto
  ) {
    return this.service.create(establishmentId, dto);
  }

  /** PATCH /api/establishments/:id/grading-templates/:tplId */
  @Patch(":templateId")
  update(
    @Param("establishmentId") establishmentId: string,
    @Param("templateId") templateId: string,
    @Body() dto: UpdateGradingTemplateDto
  ) {
    return this.service.update(establishmentId, templateId, dto);
  }

  /** DELETE /api/establishments/:id/grading-templates/:tplId */
  @Delete(":templateId")
  remove(
    @Param("establishmentId") establishmentId: string,
    @Param("templateId") templateId: string
  ) {
    return this.service.remove(establishmentId, templateId);
  }

  /** POST /api/establishments/:id/grading-templates/:tplId/apply-to-period/:periodId */
  @Post(":templateId/apply-to-period/:periodId")
  applyToPeriod(
    @Param("establishmentId") establishmentId: string,
    @Param("templateId") templateId: string,
    @Param("periodId") periodId: string
  ) {
    return this.service.applyToPeriod(establishmentId, templateId, periodId);
  }
}
