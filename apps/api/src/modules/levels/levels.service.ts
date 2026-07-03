import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLevelDto } from "./dto/create-level.dto";

@Injectable()
export class LevelsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(establishmentId: string) {
    return this.prisma.level.findMany({
      where: { establishmentId },
      orderBy: [{ orderIndex: "asc" }, { name: "asc" }]
    });
  }

  create(establishmentId: string, dto: CreateLevelDto) {
    return this.prisma.level.create({
      data: {
        establishmentId,
        name: dto.name,
        code: dto.code,
        orderIndex: dto.orderIndex ?? 0
      }
    });
  }
}

