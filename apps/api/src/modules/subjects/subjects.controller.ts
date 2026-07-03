import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AssignSubjectDto } from "./dto/assign-subject.dto";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { SubjectsService } from "./subjects.service";

@ApiTags("subjects")
@Controller("establishments/:establishmentId")
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get("subjects")
  findAll(@Param("establishmentId") establishmentId: string) {
    return this.subjectsService.findAll(establishmentId);
  }

  @Post("subjects")
  create(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CreateSubjectDto
  ) {
    return this.subjectsService.create(establishmentId, dto);
  }

  @Post("classes/:classId/subjects")
  assignToClass(
    @Param("establishmentId") establishmentId: string,
    @Param("classId") classId: string,
    @Body() dto: AssignSubjectDto
  ) {
    return this.subjectsService.assignToClass(establishmentId, classId, dto);
  }
}

