import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTeacherDto } from "./dto/create-teacher.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";

function teacherInclude() {
  return {
    mainClasses: {
      include: {
        academicYear: true,
        level: true
      },
      orderBy: [{ academicYear: { startsAt: "desc" as const } }, { name: "asc" as const }]
    },
    classSubjects: {
      include: {
        class: {
          include: {
            academicYear: true,
            level: true
          }
        },
        subject: true
      },
      orderBy: [{ class: { name: "asc" as const } }, { subject: { name: "asc" as const } }]
    }
  };
}

function normalizedTeacherData(dto: CreateTeacherDto | UpdateTeacherDto) {
  return {
    ...dto,
    firstName: dto.firstName?.trim(),
    lastName: dto.lastName?.trim(),
    email: dto.email?.trim().toLowerCase(),
    phone: dto.phone?.trim(),
    hourlyRate: dto.hourlyRate === undefined ? undefined : dto.hourlyRate
  };
}

function money(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function normalizeTeacher(teacher: any) {
  return {
    ...teacher,
    hourlyRate: money(teacher.hourlyRate),
    classSubjects:
      teacher.classSubjects?.map((classSubject: any) => ({
        ...classSubject,
        coefficient: money(classSubject.coefficient)
      })) ?? [],
    mainClasses: teacher.mainClasses ?? []
  };
}

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(establishmentId: string) {
    const teachers = await this.prisma.teacher.findMany({
      where: { establishmentId },
      include: teacherInclude(),
      orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
    });

    return teachers.map(normalizeTeacher);
  }

  async create(establishmentId: string, dto: CreateTeacherDto) {
    await this.ensureUniqueContact(establishmentId, dto);

    const teacher = await this.prisma.teacher.create({
      data: {
        establishmentId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim().toLowerCase(),
        employmentType: dto.employmentType ?? "vacataire",
        status: dto.status ?? "active",
        hourlyRate: dto.hourlyRate ?? 0
      },
      include: teacherInclude()
    });

    return normalizeTeacher(teacher);
  }

  async update(establishmentId: string, teacherId: string, dto: UpdateTeacherDto) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, establishmentId },
      select: { id: true }
    });

    if (!teacher) {
      throw new NotFoundException("Enseignant introuvable.");
    }

    await this.ensureUniqueContact(establishmentId, dto, teacherId);

    const updated = await this.prisma.teacher.update({
      where: { id: teacherId },
      data: normalizedTeacherData(dto),
      include: teacherInclude()
    });

    return normalizeTeacher(updated);
  }

  private async ensureUniqueContact(
    establishmentId: string,
    dto: CreateTeacherDto | UpdateTeacherDto,
    ignoreTeacherId?: string
  ) {
    if (!dto.email && !dto.phone) {
      return;
    }

    const existing = await this.prisma.teacher.findFirst({
      where: {
        establishmentId,
        ...(ignoreTeacherId ? { id: { not: ignoreTeacherId } } : {}),
        OR: [
          ...(dto.email ? [{ email: dto.email.trim().toLowerCase() }] : []),
          ...(dto.phone ? [{ phone: dto.phone.trim() }] : [])
        ]
      },
      select: { id: true }
    });

    if (existing) {
      throw new BadRequestException("Un enseignant utilise deja ce telephone ou cet email.");
    }
  }
}
