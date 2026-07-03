import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAcademicYearDto } from "./dto/create-academic-year.dto";

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(establishmentId: string) {
    return this.prisma.academicYear.findMany({
      where: { establishmentId },
      orderBy: { startsAt: "desc" }
    });
  }

  async create(establishmentId: string, dto: CreateAcademicYearDto) {
    if (dto.status === "ACTIVE") {
      return this.prisma.$transaction(async (tx) => {
        await tx.academicYear.updateMany({
          where: { establishmentId, status: "ACTIVE" },
          data: { status: "ARCHIVED" }
        });

        const academicYear = await tx.academicYear.create({
          data: {
            establishmentId,
            name: dto.name,
            startsAt: new Date(dto.startsAt),
            endsAt: new Date(dto.endsAt),
            status: "ACTIVE"
          }
        });

        await tx.establishment.update({
          where: { id: establishmentId },
          data: { activeAcademicYearId: academicYear.id }
        });

        return academicYear;
      });
    }

    return this.prisma.academicYear.create({
      data: {
        establishmentId,
        name: dto.name,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        status: dto.status ?? "DRAFT"
      }
    });
  }

  async activate(establishmentId: string, academicYearId: string) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, establishmentId }
    });

    if (!academicYear) {
      throw new NotFoundException("Annee scolaire introuvable.");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: { establishmentId, status: "ACTIVE" },
        data: { status: "ARCHIVED" }
      });

      const activeYear = await tx.academicYear.update({
        where: { id: academicYearId },
        data: { status: "ACTIVE" }
      });

      await tx.establishment.update({
        where: { id: establishmentId },
        data: { activeAcademicYearId: academicYearId }
      });

      return activeYear;
    });
  }
}
