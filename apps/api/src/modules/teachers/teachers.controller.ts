import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateTeacherDto } from "./dto/create-teacher.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";
import { TeachersService } from "./teachers.service";

@ApiTags("teachers")
@Controller("establishments/:establishmentId/teachers")
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  findAll(@Param("establishmentId") establishmentId: string) {
    return this.teachersService.findAll(establishmentId);
  }

  @Post()
  create(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CreateTeacherDto
  ) {
    return this.teachersService.create(establishmentId, dto);
  }

  @Patch(":teacherId")
  update(
    @Param("establishmentId") establishmentId: string,
    @Param("teacherId") teacherId: string,
    @Body() dto: UpdateTeacherDto
  ) {
    return this.teachersService.update(establishmentId, teacherId, dto);
  }
}
