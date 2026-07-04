import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { StartImportDto } from "./dto/start-import.dto";
import { ImportsService } from "./imports.service";

@ApiTags("imports")
@Controller("establishments/:establishmentId/imports")
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get()
  getImportJobs(@Param("establishmentId") establishmentId: string) {
    return this.importsService.getImportJobs(establishmentId);
  }

  @Post("students")
  startStudentImport(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: StartImportDto
  ) {
    return this.importsService.startStudentImport(establishmentId, dto);
  }
}
