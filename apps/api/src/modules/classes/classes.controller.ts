import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ClassesService } from "./classes.service";
import { AssignMainTeacherDto } from "./dto/assign-main-teacher.dto";
import { CreateClassDto } from "./dto/create-class.dto";

@ApiTags("classes")
@Controller("establishments/:establishmentId/classes")
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  findAll(@Param("establishmentId") establishmentId: string) {
    return this.classesService.findAll(establishmentId);
  }

  @Post()
  create(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CreateClassDto
  ) {
    return this.classesService.create(establishmentId, dto);
  }

  @Patch(":classId/main-teacher")
  assignMainTeacher(
    @Param("establishmentId") establishmentId: string,
    @Param("classId") classId: string,
    @Body() dto: AssignMainTeacherDto
  ) {
    return this.classesService.assignMainTeacher(establishmentId, classId, dto);
  }
}
