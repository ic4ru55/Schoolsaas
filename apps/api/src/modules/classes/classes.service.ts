import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClassDto } from "./dto/create-class.dto";

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(establishmentId: string) {
    return this.prisma.schoolClass.findMany({
      where: { establishmentId },
      include: {
        academicYear: true,
        level: true,
        classSubjects: {
          include: {
            subject: true
          },
          orderBy: {
            subject: {
              name: "asc"
            }
          }
        }
      },
      orderBy: [{ academicYear: { startsAt: "desc" } }, { name: "asc" }]
    });
  }

  async create(establishmentId: string, dto: CreateClassDto) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, establishmentId }
    });

    if (!academicYear) {
      throw new BadRequestException("L'annee scolaire indiquee est introuvable.");
    }

    if (dto.levelId) {
      const level = await this.prisma.level.findFirst({
        where: { id: dto.levelId, establishmentId }
      });

      if (!level) {
        throw new BadRequestException("Le niveau indique est introuvable.");
      }
    }

    return this.prisma.schoolClass.create({
      data: {
        establishmentId,
        academicYearId: dto.academicYearId,
        levelId: dto.levelId,
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity
      },
      include: {
        academicYear: true,
        level: true,
        classSubjects: {
          include: {
            subject: true
          }
        }
      }
    });
  }
}

