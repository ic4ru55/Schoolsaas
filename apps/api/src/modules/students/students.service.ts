import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentDocumentDto } from "./dto/create-student-document.dto";
import { CreateStudentDto } from "./dto/create-student.dto";

const MAX_DOCUMENT_SIZE_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

function matriculeYear(academicYearName?: string) {
  return academicYearName?.match(/\d{4}/)?.[0] ?? new Date().getFullYear().toString();
}

function buildMatricule({
  format,
  prefix,
  number,
  padding,
  academicYearName
}: {
  format: string;
  prefix: string;
  number: number;
  padding: number;
  academicYearName?: string;
}) {
  const sequence = String(number).padStart(padding, "0");
  return format
    .replace(/\{PREFIX\}/g, prefix)
    .replace(/\{YEAR\}/g, matriculeYear(academicYearName))
    .replace(/\{SEQ\}/g, sequence);
}

function safeFileStem(value: string) {
  const stem = value.replace(extname(value), "");
  return stem
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "document";
}

function decodeBase64File(value: string) {
  const base64 = value.includes(",") ? value.split(",").pop() ?? "" : value;
  if (!base64 || base64.length > Math.ceil((MAX_DOCUMENT_SIZE_BYTES * 4) / 3) + 128) {
    throw new BadRequestException("Le fichier est vide ou trop volumineux.");
  }

  return Buffer.from(base64, "base64");
}

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(establishmentId: string, search?: string) {
    return this.prisma.student.findMany({
      where: {
        establishmentId,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { matricule: { contains: search, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        enrollments: {
          include: {
            academicYear: true,
            class: {
              include: {
                level: true
              }
            }
          },
          orderBy: {
            enrolledAt: "desc"
          }
        },
        guardians: {
          include: {
            guardian: true
          },
          orderBy: {
            isPrimary: "desc"
          }
        },
        documents: {
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    });
  }

  async create(establishmentId: string, dto: CreateStudentDto) {
    return this.prisma.$transaction(async (tx) => {
      const schoolClass = dto.classId
        ? await tx.schoolClass.findFirst({
            where: { id: dto.classId, establishmentId },
            include: { academicYear: true }
          })
        : null;

      if (dto.classId && !schoolClass) {
        throw new BadRequestException("La classe indiquee est introuvable.");
      }

      let matricule = "";
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const establishment = await tx.establishment.update({
          where: { id: establishmentId },
          data: {
            studentMatriculeNextNumber: {
              increment: 1
            }
          },
          select: {
            studentMatriculePrefix: true,
            studentMatriculeFormat: true,
            studentMatriculeNextNumber: true,
            studentMatriculePadding: true
          }
        });
        matricule = buildMatricule({
          prefix: establishment.studentMatriculePrefix,
          format: establishment.studentMatriculeFormat,
          number: establishment.studentMatriculeNextNumber - 1,
          padding: establishment.studentMatriculePadding,
          academicYearName: schoolClass?.academicYear.name
        });
        const existing = await tx.student.findUnique({
          where: {
            establishmentId_matricule: {
              establishmentId,
              matricule
            }
          },
          select: { id: true }
        });

        if (!existing) {
          break;
        }

        if (attempt === 99) {
          throw new BadRequestException("Impossible de generer un matricule unique.");
        }
      }

      const student = await tx.student.create({
        data: {
          establishmentId,
          matricule,
          firstName: dto.firstName,
          lastName: dto.lastName,
          gender: dto.gender,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          birthPlace: dto.birthPlace,
          nationality: dto.nationality
        }
      });

      if (schoolClass) {
        await tx.enrollment.create({
          data: {
            establishmentId,
            studentId: student.id,
            academicYearId: schoolClass.academicYearId,
            classId: schoolClass.id,
            enrollmentType: dto.enrollmentType
          }
        });
      }

      if (dto.guardians?.length) {
        for (const [index, guardian] of dto.guardians.entries()) {
          const createdGuardian = await tx.guardian.create({
            data: {
              establishmentId,
              firstName: guardian.firstName,
              lastName: guardian.lastName,
              phone: guardian.phone,
              email: guardian.email,
              address: guardian.address,
              profession: guardian.profession
            }
          });

          await tx.studentGuardian.create({
            data: {
              establishmentId,
              studentId: student.id,
              guardianId: createdGuardian.id,
              relationship: guardian.relationship,
              isPrimary: guardian.isPrimary ?? index === 0
            }
          });
        }
      }

      return tx.student.findUniqueOrThrow({
        where: { id: student.id },
        include: {
          enrollments: {
            include: {
              academicYear: true,
              class: {
                include: {
                  level: true
                }
              }
            },
            orderBy: {
              enrolledAt: "desc"
            }
          },
          guardians: {
            include: {
              guardian: true
            },
            orderBy: {
              isPrimary: "desc"
            }
          },
          documents: {
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      });
    });
  }

  findDocuments(establishmentId: string, studentId: string) {
    return this.prisma.studentDocument.findMany({
      where: {
        establishmentId,
        studentId
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async uploadDocument(
    establishmentId: string,
    studentId: string,
    dto: CreateStudentDocumentDto
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, establishmentId },
      select: { id: true, matricule: true }
    });

    if (!student) {
      throw new NotFoundException("Eleve introuvable.");
    }

    const extension = MIME_EXTENSIONS[dto.mimeType];
    if (!extension) {
      throw new BadRequestException("Type de fichier non autorise.");
    }

    const fileBuffer = decodeBase64File(dto.base64Content);
    if (!fileBuffer.length || fileBuffer.length > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestException("Le fichier doit faire au maximum 8 Mo.");
    }

    const storageDirectory = join(
      process.cwd(),
      "storage",
      "student-documents",
      establishmentId,
      studentId
    );
    await mkdir(storageDirectory, { recursive: true });

    const fileName = `${Date.now()}-${randomUUID()}-${safeFileStem(dto.originalName)}${extension}`;
    const absolutePath = join(storageDirectory, fileName);
    await writeFile(absolutePath, fileBuffer);

    const storagePath = join(
      "storage",
      "student-documents",
      establishmentId,
      studentId,
      fileName
    ).replace(/\\/g, "/");

    return this.prisma.studentDocument.create({
      data: {
        establishmentId,
        studentId,
        documentType: dto.documentType,
        label: dto.label,
        originalName: dto.originalName,
        fileName,
        mimeType: dto.mimeType,
        sizeBytes: fileBuffer.length,
        storagePath
      }
    });
  }
}
