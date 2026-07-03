import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import { extname, join } from "path";
import { BadRequestException, Injectable, NotFoundException, StreamableFile } from "@nestjs/common";
import { EnrollmentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentDocumentDto } from "./dto/create-student-document.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

const MAX_DOCUMENT_SIZE_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

const studentInclude = {
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
      enrolledAt: "desc" as const
    }
  },
  guardians: {
    include: {
      guardian: true
    },
    orderBy: {
      isPrimary: "desc" as const
    }
  },
  documents: {
    orderBy: {
      createdAt: "desc" as const
    }
  }
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

function safeDownloadName(originalName: string, mimeType: string) {
  const extension = extname(originalName) || MIME_EXTENSIONS[mimeType] || "";
  return `${safeFileStem(originalName)}${extension}`;
}

function decodeBase64File(value: string) {
  const base64 = value.includes(",") ? value.split(",").pop() ?? "" : value;
  if (!base64 || base64.length > Math.ceil((MAX_DOCUMENT_SIZE_BYTES * 4) / 3) + 128) {
    throw new BadRequestException("Le fichier est vide ou trop volumineux.");
  }

  return Buffer.from(base64, "base64");
}

function cleanOptionalText(value?: string) {
  if (value === undefined) {
    return undefined;
  }

  return value.trim() || null;
}

async function replaceStudentGuardians(
  tx: Prisma.TransactionClient,
  establishmentId: string,
  studentId: string,
  guardians: NonNullable<UpdateStudentDto["guardians"]>
) {
  const existingLinks = await tx.studentGuardian.findMany({
    where: { establishmentId, studentId },
    select: { guardianId: true }
  });
  const previousGuardianIds = existingLinks.map((item) => item.guardianId);

  await tx.studentGuardian.deleteMany({
    where: { establishmentId, studentId }
  });

  if (previousGuardianIds.length) {
    await tx.guardian.deleteMany({
      where: {
        establishmentId,
        id: { in: previousGuardianIds },
        students: {
          none: {}
        }
      }
    });
  }

  for (const [index, guardian] of guardians.entries()) {
    const createdGuardian = await tx.guardian.create({
      data: {
        establishmentId,
        firstName: guardian.firstName.trim(),
        lastName: guardian.lastName.trim(),
        phone: guardian.phone.trim(),
        email: cleanOptionalText(guardian.email),
        address: cleanOptionalText(guardian.address),
        profession: cleanOptionalText(guardian.profession)
      }
    });

    await tx.studentGuardian.create({
      data: {
        establishmentId,
        studentId,
        guardianId: createdGuardian.id,
        relationship: guardian.relationship.trim(),
        isPrimary: guardian.isPrimary ?? index === 0
      }
    });
  }
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
      include: studentInclude,
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
        include: studentInclude
      });
    });
  }

  async update(establishmentId: string, studentId: string, dto: UpdateStudentDto) {
    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.findFirst({
        where: { id: studentId, establishmentId },
        select: { id: true }
      });

      if (!student) {
        throw new NotFoundException("Eleve introuvable.");
      }

      const schoolClass = dto.classId
        ? await tx.schoolClass.findFirst({
            where: { id: dto.classId, establishmentId },
            include: { academicYear: true }
          })
        : null;

      if (dto.classId && !schoolClass) {
        throw new BadRequestException("La classe indiquee est introuvable.");
      }

      await tx.student.update({
        where: { id: student.id },
        data: {
          firstName: dto.firstName?.trim(),
          lastName: dto.lastName?.trim(),
          gender: dto.gender,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          birthPlace: cleanOptionalText(dto.birthPlace),
          nationality: cleanOptionalText(dto.nationality),
          status: dto.status
        }
      });

      if (schoolClass) {
        await tx.enrollment.upsert({
          where: {
            studentId_academicYearId: {
              studentId: student.id,
              academicYearId: schoolClass.academicYearId
            }
          },
          update: {
            classId: schoolClass.id,
            enrollmentType: dto.enrollmentType,
            status: EnrollmentStatus.ACTIVE
          },
          create: {
            establishmentId,
            studentId: student.id,
            academicYearId: schoolClass.academicYearId,
            classId: schoolClass.id,
            enrollmentType: dto.enrollmentType,
            status: EnrollmentStatus.ACTIVE
          }
        });
      }

      if (dto.guardians) {
        await replaceStudentGuardians(tx, establishmentId, student.id, dto.guardians);
      }

      return tx.student.findUniqueOrThrow({
        where: { id: student.id },
        include: studentInclude
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

  async getDocumentFile(
    establishmentId: string,
    studentId: string,
    documentId: string,
    download = false
  ) {
    const document = await this.prisma.studentDocument.findFirst({
      where: {
        id: documentId,
        establishmentId,
        studentId
      }
    });

    if (!document) {
      throw new NotFoundException("Document introuvable.");
    }

    const absolutePath = join(process.cwd(), document.storagePath);
    let fileStats: Awaited<ReturnType<typeof stat>>;
    try {
      fileStats = await stat(absolutePath);
    } catch {
      throw new NotFoundException("Fichier introuvable sur le disque.");
    }

    const disposition = download ? "attachment" : "inline";
    return new StreamableFile(createReadStream(absolutePath), {
      type: document.mimeType,
      disposition: `${disposition}; filename="${safeDownloadName(
        document.originalName,
        document.mimeType
      )}"`,
      length: fileStats.size
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

  async deleteDocument(establishmentId: string, studentId: string, documentId: string) {
    const document = await this.prisma.studentDocument.findFirst({
      where: {
        id: documentId,
        establishmentId,
        studentId
      }
    });

    if (!document) {
      throw new NotFoundException("Document introuvable.");
    }

    try {
      await unlink(join(process.cwd(), document.storagePath));
    } catch {
      // Le fichier peut deja manquer sur disque ; le dossier administratif doit rester nettoyable.
    }

    await this.prisma.studentDocument.delete({
      where: {
        id: documentId
      }
    });

    return { id: documentId, deleted: true };
  }
}
