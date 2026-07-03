import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AssignMainTeacherDto } from "./dto/assign-main-teacher.dto";
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
        mainTeacher: true,
        classSubjects: {
          include: {
            subject: true,
            teacher: true
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

    if (dto.mainTeacherId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { id: dto.mainTeacherId, establishmentId }
      });

      if (!teacher) {
        throw new BadRequestException("L'enseignant titulaire indique est introuvable.");
      }
    }

    return this.prisma.schoolClass.create({
      data: {
        establishmentId,
        academicYearId: dto.academicYearId,
        levelId: dto.levelId,
        mainTeacherId: dto.mainTeacherId,
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity
      },
      include: {
        academicYear: true,
        level: true,
        mainTeacher: true,
        classSubjects: {
          include: {
            subject: true,
            teacher: true
          }
        }
      }
    });
  }

  async assignMainTeacher(
    establishmentId: string,
    classId: string,
    dto: AssignMainTeacherDto
  ) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, establishmentId }
    });

    if (!schoolClass) {
      throw new BadRequestException("La classe indiquee est introuvable.");
    }

    if (dto.teacherId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { id: dto.teacherId, establishmentId }
      });

      if (!teacher) {
        throw new BadRequestException("L'enseignant indique est introuvable.");
      }
    }

    return this.prisma.schoolClass.update({
      where: { id: classId },
      data: {
        mainTeacherId: dto.teacherId || null
      },
      include: {
        academicYear: true,
        level: true,
        mainTeacher: true,
        classSubjects: {
          include: {
            subject: true,
            teacher: true
          }
        }
      }
    });
  }
}
