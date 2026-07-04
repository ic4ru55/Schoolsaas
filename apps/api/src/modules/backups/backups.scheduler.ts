import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { BackupsService } from "./backups.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class BackupsSchedulerService {
  private readonly logger = new Logger(BackupsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly backupsService: BackupsService,
    private readonly auditLogs: AuditLogsService,
    private readonly config: ConfigService
  ) {}

  /**
   * Sauvegarde hebdomadaire automatique — chaque samedi à 23h00.
   * Lance une sauvegarde locale + copie simulée vers le répertoire cloud.
   */
  @Cron("0 23 * * 6", {
    name: "weekly-backup",
    timeZone: "Africa/Ouagadougou"
  })
  async runWeeklyBackup() {
    this.logger.log("🗓️  Démarrage de la sauvegarde hebdomadaire automatique...");

    // Récupère tous les établissements actifs
    const establishments = await this.prisma.establishment.findMany({
      select: { id: true, name: true }
    });

    if (!establishments.length) {
      this.logger.warn("Aucun établissement trouvé pour la sauvegarde.");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const establishment of establishments) {
      try {
        this.logger.log(`  📦 Sauvegarde de "${establishment.name}" (${establishment.id})...`);

        // Sauvegarde locale (réutilise la logique existante)
        const job = await this.backupsService.startManualBackup(establishment.id);

        if (job.status === "SUCCESS" && job.localPath) {
          // Copie vers le répertoire "cloud" simulé
          await this.uploadToCloud(establishment.id, job.localPath);

          // Log d'audit
          await this.auditLogs.log({
            establishmentId: establishment.id,
            userId: null,
            action: "BACKUP_WEEKLY_AUTO",
            entityType: "BackupJob",
            entityId: job.id,
            newValues: {
              backupId: job.id,
              localPath: job.localPath,
              cloudPath: job.cloudPath,
              sizeBytes: job.sizeBytes?.toString(),
              checksum: job.checksum
            },
            reason: "Sauvegarde hebdomadaire automatique"
          });

          successCount++;
          this.logger.log(`  ✅ "${establishment.name}" — Succès (Job: ${job.id})`);
        } else {
          failCount++;
          this.logger.error(`  ❌ "${establishment.name}" — Échec: ${job.errorMessage}`);
        }
      } catch (err: any) {
        failCount++;
        this.logger.error(
          `  ❌ "${establishment.name}" — Exception: ${err?.message}`
        );
      }
    }

    this.logger.log(
      `🏁 Sauvegarde hebdomadaire terminée. Succès: ${successCount}, Échecs: ${failCount}`
    );
  }

  /**
   * Copie le fichier de sauvegarde vers le répertoire cloud simulé.
   * Dans une version production, cette méthode enverrait vers S3, GCS, etc.
   */
  private async uploadToCloud(establishmentId: string, localPath: string): Promise<string> {
    const cloudBaseDir = this.config.get<string>("BACKUP_CLOUD_DIR", "./data/cloud-backups");
    const cloudDir = path.resolve(cloudBaseDir, establishmentId);

    fs.mkdirSync(cloudDir, { recursive: true });

    const fileName = path.basename(localPath);
    const cloudPath = path.join(cloudDir, fileName);

    fs.copyFileSync(localPath, cloudPath);

    // Mettre à jour le champ cloudPath du job en base
    await this.prisma.backupJob.updateMany({
      where: { localPath },
      data: { cloudPath }
    });

    return cloudPath;
  }
}
