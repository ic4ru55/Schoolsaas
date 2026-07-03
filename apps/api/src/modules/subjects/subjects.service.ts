import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AssignSubjectDto } from "./dto/assign-subject.dto";
import { CreateSubjectDto } from "./dto/create-subject.dto";

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(establishmentId: string) {
    return this.prisma.subject.findMany({
      where: { establishmentId },
      orderBy: [{ subjectGroup: "asc" }, { name: "asc" }]
    });
  }

  create(establishmentId: string, dto: CreateSubjectDto) {
    return this.prisma.subject.create({
      data: {
        establishmentId,
        name: dto.name,
        code: dto.code,
        subjectGroup: dto.subjectGroup
      }
    });
  }

  async assignToClass(
    establishmentId: string,
    classId: string,
    dto: AssignSubjectDto
  ) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, establishmentId }
    });

    if (!schoolClass) {
      throw new BadRequestException("La classe indiquee est introuvable.");
    }

    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, establishmentId }
    });

    if (!subject) {
      throw new BadRequestException("La matiere indiquee est introuvable.");
    }

    return this.prisma.classSubject.upsert({
      where: {
        classId_subjectId: {
          classId,
          subjectId: dto.subjectId
        }
      },
      update: {
        coefficient: dto.coefficient ?? 1
      },
      create: {
        establishmentId,
        classId,
        subjectId: dto.subjectId,
        coefficient: dto.coefficient ?? 1
      },
      include: {
        class: true,
        subject: true
      }
    });
  }
}

