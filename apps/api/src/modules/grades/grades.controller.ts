import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import { CreatePeriodDto } from "./dto/create-period.dto";
import { SaveGradesDto } from "./dto/save-grades.dto";
import { GradesService } from "./grades.service";

@ApiTags("grades")
@Controller("establishments/:establishmentId/grades")
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get("overview")
  overview(
    @Param("establishmentId") establishmentId: string,
    @Query("academicYearId") academicYearId?: string,
    @Query("classId") classId?: string,
    @Query("periodId") periodId?: string
  ) {
    return this.gradesService.overview(establishmentId, academicYearId, classId, periodId);
  }

  @Get("report-card")
  reportCard(
    @Param("establishmentId") establishmentId: string,
    @Query("periodId") periodId: string,
    @Query("classId") classId: string
  ) {
    return this.gradesService.reportCard(establishmentId, periodId, classId);
  }

  @Post("periods")
  createPeriod(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CreatePeriodDto
  ) {
    return this.gradesService.createPeriod(establishmentId, dto);
  }

  @Post("assessments")
  createAssessment(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CreateAssessmentDto
  ) {
    return this.gradesService.createAssessment(establishmentId, dto);
  }

  @Post("entries")
  saveGrades(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: SaveGradesDto
  ) {
    return this.gradesService.saveGrades(establishmentId, dto);
  }
}
