import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ClassesService } from "./classes.service";
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
}

