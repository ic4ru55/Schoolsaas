import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

@Injectable()
export class BackupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditLogs: AuditLogsService
  ) {}

  async findAll(establishmentId: string) {
    return this.prisma.backupJob.findMany({
      where: { establishmentId },
      orderBy: { startedAt: "desc" },
      take: 20
    });
  }

  async startManualBackup(establishmentId: string) {
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId }
    });

    if (!establishment) {
      throw new BadRequestException("Établissement introuvable.");
    }

    const backupDir = this.config.get<string>("BACKUP_LOCAL_DIR", "./data/backups");
    const encryptionKey = this.config.get<string>("BACKUP_ENCRYPTION_KEY", "");

    // Créer le répertoire de backup s'il n'existe pas
    const fullBackupDir = path.resolve(backupDir, establishmentId);
    fs.mkdirSync(fullBackupDir, { recursive: true });

    // Créer le job en base
    const job = await this.prisma.backupJob.create({
      data: {
        establishmentId,
        type: "manual",
        status: "RUNNING",
        encrypted: Boolean(encryptionKey && encryptionKey !== "replace-with-a-32-byte-secret")
      }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpFileName = `backup-${timestamp}.json`;
    const dumpFilePath = path.join(fullBackupDir, dumpFileName);

    try {
      // Export complet via Prisma (toutes les tables liées à l'établissement)
      const data = await this.exportEstablishmentData(establishmentId);
      const jsonContent = JSON.stringify(data, null, 2);
      const fileBuffer = Buffer.from(jsonContent, "utf-8");

      // Calculer le checksum
      const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      // Chiffrer si une clé est définie
      let finalPath = dumpFilePath;
      if (encryptionKey && encryptionKey !== "replace-with-a-32-byte-secret") {
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(encryptionKey, "schoolsaas-salt", 32);
        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        const encrypted = Buffer.concat([iv, cipher.update(fileBuffer), cipher.final()]);
        finalPath = dumpFilePath + ".enc";
        fs.writeFileSync(finalPath, encrypted);
      } else {
        fs.writeFileSync(dumpFilePath, fileBuffer);
      }

      const stat = fs.statSync(finalPath);

      // Mettre à jour le job
      const updatedJob = await this.prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCESS",
          localPath: finalPath,
          sizeBytes: stat.size,
          checksum,
          completedAt: new Date()
        }
      });

      // Audit log — sauvegarde manuelle réussie
      await this.auditLogs.log({
        establishmentId,
        action: "BACKUP_MANUAL_SUCCESS",
        entityType: "BackupJob",
        entityId: job.id,
        newValues: { type: "manual", sizeBytes: stat.size, checksum: checksum.slice(0, 16) }
      });

      return updatedJob;
    } catch (error: any) {
      const updatedJob = await this.prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: error?.message || "Erreur inconnue lors de l'export.",
          completedAt: new Date()
        }
      });

      // Audit log — sauvegarde manuelle échouée
      await this.auditLogs.log({
        establishmentId,
        action: "BACKUP_MANUAL_FAILED",
        entityType: "BackupJob",
        entityId: job.id,
        newValues: { type: "manual", error: error?.message || "Erreur inconnue" }
      });

      return updatedJob;
    }
  }

  /**
   * Exporte toutes les données liées à un établissement sous forme JSON.
   * Inclut : années scolaires, niveaux, classes, matières, élèves,
   * inscriptions, enseignants, frais, paiements, périodes, évaluations, notes.
   */
  private async exportEstablishmentData(establishmentId: string) {
    const [
      establishment,
      academicYears,
      levels,
      classes,
      subjects,
      classSubjects,
      students,
      enrollments,
      teachers,
      feeItems,
      studentFeeAssignments,
      payments,
      periods,
      assessments,
      grades
    ] = await Promise.all([
      this.prisma.establishment.findUnique({ where: { id: establishmentId } }),
      this.prisma.academicYear.findMany({ where: { establishmentId } }),
      this.prisma.level.findMany({ where: { establishmentId } }),
      this.prisma.schoolClass.findMany({ where: { establishmentId } }),
      this.prisma.subject.findMany({ where: { establishmentId } }),
      this.prisma.classSubject.findMany({
        where: { establishmentId }
      }),
      this.prisma.student.findMany({ where: { establishmentId } }),
      this.prisma.enrollment.findMany({
        where: { establishmentId }
      }),
      this.prisma.teacher.findMany({ where: { establishmentId } }),
      this.prisma.feeItem.findMany({ where: { establishmentId } }),
      this.prisma.studentFeeAssignment.findMany({
        where: { feeItem: { establishmentId } }
      }),
      this.prisma.payment.findMany({
        where: { establishmentId }
      }),
      this.prisma.period.findMany({
        where: { academicYear: { establishmentId } }
      }),
      this.prisma.assessment.findMany({
        where: { period: { academicYear: { establishmentId } } }
      }),
      this.prisma.grade.findMany({
        where: { assessment: { period: { academicYear: { establishmentId } } } }
      })
    ]);

    return {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      establishmentId,
      establishment,
      academicYears,
      levels,
      classes,
      subjects,
      classSubjects,
      students,
      enrollments,
      teachers,
      feeItems,
      studentFeeAssignments,
      payments,
      periods,
      assessments,
      grades
    };
  }

  async downloadBackup(establishmentId: string, backupId: string) {
    const job = await this.prisma.backupJob.findFirst({
      where: { id: backupId, establishmentId, status: "SUCCESS" }
    });

    if (!job || !job.localPath) {
      throw new BadRequestException("Sauvegarde introuvable ou non terminée.");
    }

    if (!fs.existsSync(job.localPath)) {
      throw new BadRequestException("Le fichier de sauvegarde n'existe plus sur le serveur.");
    }

    return {
      filePath: job.localPath,
      fileName: path.basename(job.localPath)
    };
  }

  async restoreBackup(establishmentId: string, backupId: string) {
    const job = await this.prisma.backupJob.findFirst({
      where: { id: backupId, establishmentId, status: "SUCCESS" }
    });

    if (!job || !job.localPath) {
      throw new BadRequestException("Sauvegarde introuvable ou non terminée.");
    }

    if (!fs.existsSync(job.localPath)) {
      throw new BadRequestException("Le fichier de sauvegarde n'existe plus sur le serveur.");
    }

    const encryptionKey = this.config.get<string>("BACKUP_ENCRYPTION_KEY", "");
    let jsonContent: string;

    if (job.encrypted && encryptionKey && encryptionKey !== "replace-with-a-32-byte-secret") {
      const fileBuffer = fs.readFileSync(job.localPath);
      const iv = fileBuffer.subarray(0, 16);
      const encrypted = fileBuffer.subarray(16);
      const key = crypto.scryptSync(encryptionKey, "schoolsaas-salt", 32);
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      jsonContent = decrypted.toString("utf-8");
    } else {
      jsonContent = fs.readFileSync(job.localPath, "utf-8");
    }

    const data = JSON.parse(jsonContent);

    // Restauration transactionnelle : on supprime puis réinsère
    await this.prisma.$transaction(async (tx) => {
      // Supprimer dans l'ordre inverse des dépendances
      await tx.grade.deleteMany({ where: { assessment: { period: { academicYear: { establishmentId } } } } });
      await tx.assessment.deleteMany({ where: { period: { academicYear: { establishmentId } } } });
      await tx.period.deleteMany({ where: { academicYear: { establishmentId } } });
      await tx.payment.deleteMany({ where: { establishmentId } });
      await tx.studentFeeAssignment.deleteMany({ where: { feeItem: { establishmentId } } });
      await tx.feeItem.deleteMany({ where: { establishmentId } });
      await tx.enrollment.deleteMany({ where: { establishmentId } });
      await tx.classSubject.deleteMany({ where: { establishmentId } });
      await tx.student.deleteMany({ where: { establishmentId } });
      await tx.teacher.deleteMany({ where: { establishmentId } });
      await tx.subject.deleteMany({ where: { establishmentId } });
      await tx.schoolClass.deleteMany({ where: { establishmentId } });
      await tx.level.deleteMany({ where: { establishmentId } });
      await tx.academicYear.deleteMany({ where: { establishmentId } });

      // Réinsérer les données
      if (data.academicYears?.length) await tx.academicYear.createMany({ data: data.academicYears, skipDuplicates: true });
      if (data.levels?.length) await tx.level.createMany({ data: data.levels, skipDuplicates: true });
      if (data.classes?.length) await tx.schoolClass.createMany({ data: data.classes, skipDuplicates: true });
      if (data.subjects?.length) await tx.subject.createMany({ data: data.subjects, skipDuplicates: true });
      if (data.teachers?.length) await tx.teacher.createMany({ data: data.teachers, skipDuplicates: true });
      if (data.classSubjects?.length) await tx.classSubject.createMany({ data: data.classSubjects, skipDuplicates: true });
      if (data.students?.length) await tx.student.createMany({ data: data.students, skipDuplicates: true });
      if (data.enrollments?.length) await tx.enrollment.createMany({ data: data.enrollments, skipDuplicates: true });
      if (data.feeItems?.length) await tx.feeItem.createMany({ data: data.feeItems, skipDuplicates: true });
      if (data.studentFeeAssignments?.length) await tx.studentFeeAssignment.createMany({ data: data.studentFeeAssignments, skipDuplicates: true });
      if (data.payments?.length) await tx.payment.createMany({ data: data.payments, skipDuplicates: true });
      if (data.periods?.length) await tx.period.createMany({ data: data.periods, skipDuplicates: true });
      if (data.assessments?.length) await tx.assessment.createMany({ data: data.assessments, skipDuplicates: true });
      if (data.grades?.length) await tx.grade.createMany({ data: data.grades, skipDuplicates: true });
    }, { timeout: 60000 });

    return { success: true, restoredFrom: job.startedAt };
  }

  async deleteBackup(establishmentId: string, backupId: string) {
    const job = await this.prisma.backupJob.findFirst({
      where: { id: backupId, establishmentId }
    });

    if (!job) {
      throw new BadRequestException("Sauvegarde introuvable.");
    }

    // Supprimer le fichier sur disque s'il existe
    if (job.localPath && fs.existsSync(job.localPath)) {
      fs.unlinkSync(job.localPath);
    }

    await this.prisma.backupJob.delete({ where: { id: backupId } });

    return { success: true };
  }
}
