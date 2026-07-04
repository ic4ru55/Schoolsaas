import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateAuditLogDto {
  establishmentId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: string | null;
}

// Actions critiques qui ne doivent jamais être purgées
const CRITICAL_ACTIONS = [
  "USER_DELETE",
  "USER_DEACTIVATE",
  "BACKUP_RESTORE",
  "ESTABLISHMENT_DELETE",
  "ESTABLISHMENT_SUSPEND",
  "ROLE_PERMISSION_UPDATE",
  "PASSWORD_RESET",
  "LOGIN_FAILED"
];

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre une entrée dans le journal d'activité.
   * Ne lève jamais d'exception pour ne pas bloquer le flux métier principal.
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          establishmentId: dto.establishmentId ?? null,
          userId: dto.userId ?? null,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId ?? null,
          oldValues: dto.oldValues != null
            ? (dto.oldValues as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          newValues: dto.newValues != null
            ? (dto.newValues as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          ipAddress: dto.ipAddress ?? null,
          userAgent: dto.userAgent ?? null,
          reason: dto.reason ?? null
        }
      });
    } catch (err) {
      // Ne pas casser le flux métier si le log échoue
      console.error("[AuditLog] Erreur lors de l'enregistrement du log:", err);
    }
  }

  /**
   * Retourne les logs d'un établissement (pour les admins locaux).
   * Paginated, tri par date décroissante. Supporte le filtre par action.
   */
  async findByEstablishment(
    establishmentId: string,
    page = 1,
    limit = 50,
    action?: string
  ) {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { establishmentId };
    if (action) {
      where.action = { contains: action, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, fullName: true, email: true }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return { data, total, page, limit };
  }

  /**
   * Retourne TOUS les logs (accès réservé au Super Admin).
   * Peut filtrer par établissement, action, utilisateur.
   */
  async findAll(params: {
    establishmentId?: string;
    action?: string;
    entityType?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.establishmentId) where.establishmentId = params.establishmentId;
    if (params.action) where.action = { contains: params.action, mode: "insensitive" };
    if (params.entityType) where.entityType = params.entityType;
    if (params.userId) where.userId = params.userId;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, fullName: true, email: true }
          },
          establishment: {
            select: { id: true, name: true }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return { data, total, page, limit };
  }

  /**
   * Statistiques agrégées pour le Dashboard
   */
  async getStats(establishmentId?: string) {
    const where = establishmentId ? { establishmentId } : {};

    const [total, last24h, last7d, byAction] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({
        where: {
          ...where,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
      this.prisma.auditLog.count({
        where: {
          ...where,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      this.prisma.auditLog.groupBy({
        by: ["action"],
        where,
        _count: { action: true },
        orderBy: { _count: { action: "desc" } },
        take: 10
      })
    ]);

    return { total, last24h, last7d, byAction };
  }

  /**
   * Purge les logs anciens (sauf les actions critiques).
   * Réservé au Super Admin.
   * @param olderThanDays Supprimer les logs plus anciens que N jours
   * @param establishmentId Si défini, purge uniquement cet établissement
   * @returns Nombre de logs supprimés
   */
  async purgeOldLogs(olderThanDays: number, establishmentId?: string): Promise<{ deleted: number }> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      createdAt: { lt: cutoffDate },
      action: { notIn: CRITICAL_ACTIONS }
    };
    if (establishmentId) {
      where.establishmentId = establishmentId;
    }

    const result = await this.prisma.auditLog.deleteMany({ where });
    return { deleted: result.count };
  }
}
