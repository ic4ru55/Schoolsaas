import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateLevelDto } from "./dto/create-level.dto";
import { LevelsService } from "./levels.service";

@ApiTags("levels")
@Controller("establishments/:establishmentId/levels")
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get()
  findAll(@Param("establishmentId") establishmentId: string) {
    return this.levelsService.findAll(establishmentId);
  }

  @Post()
  create(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CreateLevelDto
  ) {
    return this.levelsService.create(establishmentId, dto);
  }
}

