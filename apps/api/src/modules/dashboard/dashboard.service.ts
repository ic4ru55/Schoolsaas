import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(establishmentId: string) {
    const [
      establishment,
      studentsCount,
      classesCount,
      teachersCount,
      paymentsCount,
      latestBackup
    ] = await Promise.all([
      this.prisma.establishment.findUnique({ where: { id: establishmentId } }),
      this.prisma.student.count({ where: { establishmentId } }),
      this.prisma.schoolClass.count({ where: { establishmentId } }),
      this.prisma.teacher.count({ where: { establishmentId } }),
      this.prisma.payment.count({ where: { establishmentId } }),
      this.prisma.backupJob.findFirst({
        where: { establishmentId },
        orderBy: { startedAt: "desc" }
      })
    ]);

    return {
      establishment,
      metrics: {
        students: studentsCount,
        classes: classesCount,
        teachers: teachersCount,
        payments: paymentsCount
      },
      backup: latestBackup,
      alerts: [
        ...(latestBackup ? [] : ["Aucune sauvegarde locale/cloud enregistree."]),
        ...(establishment ? [] : ["Etablissement introuvable."])
      ]
    };
  }
}

