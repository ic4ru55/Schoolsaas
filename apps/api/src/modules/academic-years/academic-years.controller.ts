import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AcademicYearsService } from "./academic-years.service";
import { CreateAcademicYearDto } from "./dto/create-academic-year.dto";

@ApiTags("academic-years")
@Controller("establishments/:establishmentId/academic-years")
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Get()
  findAll(@Param("establishmentId") establishmentId: string) {
    return this.academicYearsService.findAll(establishmentId);
  }

  @Post()
  create(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CreateAcademicYearDto
  ) {
    return this.academicYearsService.create(establishmentId, dto);
  }

  @Post(":academicYearId/activate")
  activate(
    @Param("establishmentId") establishmentId: string,
    @Param("academicYearId") academicYearId: string
  ) {
    return this.academicYearsService.activate(establishmentId, academicYearId);
  }
}
