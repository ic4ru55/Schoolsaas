import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import { mkdir, stat, writeFile } from "fs/promises";
import { basename, extname, join } from "path";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile
} from "@nestjs/common";
import {
  DEFAULT_ROLES,
  MVP_MODULES,
  PERMISSIONS,
  ROLE_PERMISSION_PRESETS
} from "@schoolsaas-bf/shared";
import { LicenseStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEstablishmentDto } from "./dto/create-establishment.dto";
import { UpdateEstablishmentDto } from "./dto/update-establishment.dto";
import { UploadEstablishmentAssetDto } from "./dto/upload-establishment-asset.dto";

const MAX_ASSET_SIZE_BYTES = 2 * 1024 * 1024;
const ASSET_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};
const ASSET_MIME_BY_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(ASSET_EXTENSIONS).map(([mimeType, extension]) => [extension, mimeType])
);
const ASSET_KEYS = ["logo", "stamp", "director-signature", "cashier-signature"] as const;
type AssetKey = (typeof ASSET_KEYS)[number];
const DEFAULT_TRIAL_MONTHS = 1;
const LICENSE_STATUSES = new Set<string>(["TRIAL", "ACTIVE", "EXPIRED", "SUSPENDED"]);
const VALID_MODULE_CODES = new Set(MVP_MODULES.map((module) => module.code));

function establishmentInclude() {
  return {
    academicYears: { orderBy: { startsAt: "desc" as const } },
    licenses: { orderBy: { createdAt: "desc" as const }, take: 1 },
    modules: true
  };
}

function safeFileStem(value: string) {
  const stem = value.replace(extname(value), "");
  return (
    stem
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "identite"
  );
}

function decodeBase64Image(value: string) {
  const base64 = value.includes(",") ? value.split(",").pop() ?? "" : value;
  if (!base64 || base64.length > Math.ceil((MAX_ASSET_SIZE_BYTES * 4) / 3) + 128) {
    throw new BadRequestException("L'image est vide ou trop volumineuse.");
  }

  return Buffer.from(base64, "base64");
}

function bufferMatchesMime(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === "image/jpeg") {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/webp") {
    return (
      buffer.length > 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

function assetRouteKey(assetType: string) {
  const key = assetType.toLowerCase();
  if (!ASSET_KEYS.includes(key as AssetKey)) {
    throw new BadRequestException("Type d'image inconnu.");
  }

  return key as AssetKey;
}

function assetStorageKey(assetType: UploadEstablishmentAssetDto["assetType"]) {
  const keys: Record<UploadEstablishmentAssetDto["assetType"], AssetKey> = {
    LOGO: "logo",
    STAMP: "stamp",
    DIRECTOR_SIGNATURE: "director-signature",
    CASHIER_SIGNATURE: "cashier-signature"
  };

  return keys[assetType];
}

function assetFieldName(assetKey: AssetKey) {
  const fields: Record<AssetKey, "logoUrl" | "stampUrl" | "directorSignatureUrl" | "cashierSignatureUrl"> = {
    logo: "logoUrl",
    stamp: "stampUrl",
    "director-signature": "directorSignatureUrl",
    "cashier-signature": "cashierSignatureUrl"
  };

  return fields[assetKey];
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function parseLicenseStatus(status?: string | null) {
  if (!status) {
    return undefined;
  }

  const normalized = status.trim().toUpperCase();
  if (!LICENSE_STATUSES.has(normalized)) {
    throw new BadRequestException("Statut de licence invalide.");
  }

  return normalized as LicenseStatus;
}

function computeExpiresAt(dto: { expiresAt?: string; durationMonths?: number }, fallback?: Date | null) {
  if (dto.durationMonths !== undefined) {
    if (!Number.isInteger(dto.durationMonths) || dto.durationMonths <= 0 || dto.durationMonths > 120) {
      throw new BadRequestException("La duree de licence doit etre comprise entre 1 et 120 mois.");
    }

    return endOfDay(addMonths(new Date(), dto.durationMonths));
  }

  if (dto.expiresAt) {
    const parsed = new Date(dto.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("Date d'expiration de licence invalide.");
    }

    return endOfDay(parsed);
  }

  return fallback ?? null;
}

function effectiveStatus(status: LicenseStatus, expiresAt?: Date | null) {
  if ((status === "TRIAL" || status === "ACTIVE") && expiresAt && expiresAt.getTime() < Date.now()) {
    return LicenseStatus.EXPIRED;
  }

  return status;
}

@Injectable()
export class EstablishmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async syncExpiredLicenses() {
    await this.prisma.license.updateMany({
      where: {
        status: { in: [LicenseStatus.TRIAL, LicenseStatus.ACTIVE] },
        expiresAt: { lt: new Date() }
      },
      data: {
        status: LicenseStatus.EXPIRED,
        lastCheckAt: new Date()
      }
    });
  }

  async findAll() {
    await this.syncExpiredLicenses();
    return this.prisma.establishment.findMany({
      orderBy: { createdAt: "desc" },
      include: establishmentInclude()
    });
  }

  async findOne(id: string) {
    await this.syncExpiredLicenses();
    const establishment = await this.prisma.establishment.findUnique({
      where: { id },
      include: establishmentInclude()
    });

    if (!establishment) {
      throw new NotFoundException("Etablissement introuvable.");
    }

    return establishment;
  }

  async create(dto: CreateEstablishmentDto) {
    return this.prisma.$transaction(async (tx) => {
      const permissions = await Promise.all(
        Object.values(PERMISSIONS).map((code) =>
          tx.permission.upsert({
            where: { code },
            update: {},
            create: {
              code,
              name: code,
              moduleCode: code.split(".")[0]
            }
          })
        )
      );
      const permissionsByCode = new Map(
        permissions.map((permission) => [permission.code, permission])
      );

      const establishment = await tx.establishment.create({
        data: {
          ...dto,
          licenses: {
            create: {
              planCode: "trial",
              status: "TRIAL",
              expiresAt: endOfDay(addMonths(new Date(), DEFAULT_TRIAL_MONTHS))
            }
          },
          modules: {
            create: MVP_MODULES.map((module) => ({
              moduleCode: module.code,
              enabled: true,
              source: "trial"
            }))
          }
        }
      });

      for (const role of DEFAULT_ROLES.filter(
        (item) => item.scope !== "platform"
      )) {
        const createdRole = await tx.role.create({
          data: {
            establishmentId: establishment.id,
            code: role.code,
            name: role.label,
            systemRole: true
          }
        });

        const preset = ROLE_PERMISSION_PRESETS[role.code] ?? [];
        const rolePermissionData = preset.reduce<
          Array<{ roleId: string; permissionId: string }>
        >((items, permissionCode) => {
          const permission = permissionsByCode.get(permissionCode);
          if (permission) {
            items.push({
              roleId: createdRole.id,
              permissionId: permission.id
            });
          }

          return items;
        }, []);

        if (rolePermissionData.length) {
          await tx.rolePermission.createMany({
            data: rolePermissionData,
            skipDuplicates: true
          });
        }
      }

      return tx.establishment.findUniqueOrThrow({
        where: { id: establishment.id },
        include: establishmentInclude()
      });
    });
  }

  async update(id: string, dto: UpdateEstablishmentDto) {
    await this.findOne(id);
    const data: UpdateEstablishmentDto = {
      ...dto,
      studentMatriculePrefix: dto.studentMatriculePrefix?.trim().toUpperCase(),
      studentMatriculeFormat: dto.studentMatriculeFormat?.trim().toUpperCase()
    };

    return this.prisma.establishment.update({
      where: { id },
      data,
      include: establishmentInclude()
    });
  }

  async uploadAsset(id: string, dto: UploadEstablishmentAssetDto) {
    await this.findOne(id);

    const extension = ASSET_EXTENSIONS[dto.mimeType];
    if (!extension) {
      throw new BadRequestException("Format image non autorise.");
    }

    const fileBuffer = decodeBase64Image(dto.base64Content);
    if (!fileBuffer.length || fileBuffer.length > MAX_ASSET_SIZE_BYTES) {
      throw new BadRequestException("L'image doit faire au maximum 2 Mo.");
    }

    if (!bufferMatchesMime(fileBuffer, dto.mimeType)) {
      throw new BadRequestException("Le contenu du fichier ne correspond pas au format annonce.");
    }

    const assetKey = assetStorageKey(dto.assetType);
    const storageDirectory = join(process.cwd(), "storage", "establishment-assets", id, assetKey);
    await mkdir(storageDirectory, { recursive: true });

    const fileName = `${Date.now()}-${randomUUID()}-${safeFileStem(dto.originalName)}${extension}`;
    await writeFile(join(storageDirectory, fileName), fileBuffer);

    const publicPath = `/establishments/${id}/assets/${assetKey}/${fileName}`;
    const data = { [assetFieldName(assetKey)]: publicPath };

    return this.prisma.establishment.update({
      where: { id },
      data,
      include: establishmentInclude()
    });
  }

  async getAssetFile(id: string, assetType: string, fileName: string) {
    const assetKey = assetRouteKey(assetType);
    const normalizedFileName = basename(fileName);
    if (normalizedFileName !== fileName || fileName.includes("..")) {
      throw new BadRequestException("Nom de fichier invalide.");
    }

    const fieldName = assetFieldName(assetKey);
    const establishment = await this.prisma.establishment.findUnique({
      where: { id },
      select: {
        logoUrl: true,
        stampUrl: true,
        directorSignatureUrl: true,
        cashierSignatureUrl: true
      }
    });

    if (!establishment) {
      throw new NotFoundException("Etablissement introuvable.");
    }

    const currentUrl = establishment[fieldName];
    if (!currentUrl || !currentUrl.endsWith(`/${fileName}`)) {
      throw new NotFoundException("Image introuvable pour cet etablissement.");
    }

    const absolutePath = join(
      process.cwd(),
      "storage",
      "establishment-assets",
      id,
      assetKey,
      fileName
    );
    let fileStats: Awaited<ReturnType<typeof stat>>;
    try {
      fileStats = await stat(absolutePath);
    } catch {
      throw new NotFoundException("Fichier introuvable sur le disque.");
    }

    const mimeType = ASSET_MIME_BY_EXTENSION[extname(fileName).toLowerCase()] ?? "application/octet-stream";
    return new StreamableFile(createReadStream(absolutePath), {
      type: mimeType,
      disposition: `inline; filename="${fileName}"`,
      length: fileStats.size
    });
  }

  // ────────────────────────────────────────────────
  // SUPER ADMIN — Méthodes de gestion globale
  // ────────────────────────────────────────────────

  /**
   * Statistiques globales de la plateforme pour le Super Admin.
   */
  async getPlatformStats() {
    await this.syncExpiredLicenses();
    const [
      totalEstablishments,
      trialLicenses,
      activeLicenses,
      expiredLicenses,
      suspendedLicenses,
      totalStudents,
      totalUsers,
      recentBackups
    ] = await Promise.all([
      this.prisma.establishment.count(),
      this.prisma.license.count({ where: { status: "TRIAL" } }),
      this.prisma.license.count({ where: { status: "ACTIVE" } }),
      this.prisma.license.count({ where: { status: "EXPIRED" } }),
      this.prisma.license.count({ where: { status: "SUSPENDED" } }),
      this.prisma.student.count(),
      this.prisma.user.count(),
      this.prisma.backupJob.count({
        where: {
          status: "SUCCESS",
          startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    return {
      totalEstablishments,
      licenses: { trial: trialLicenses, active: activeLicenses, expired: expiredLicenses, suspended: suspendedLicenses },
      totalStudents,
      totalUsers,
      recentBackupsThisWeek: recentBackups
    };
  }

  /**
   * Mise à jour de la licence d'un établissement (Super Admin).
   */
  async updateLicense(
    establishmentId: string,
    dto: {
      planCode?: string;
      status?: string;
      expiresAt?: string;
      maxStudents?: number;
      durationMonths?: number;
    }
  ) {
    const establishment = await this.findOne(establishmentId);
    const currentLicense = establishment.licenses[0];
    const nextExpiresAt = computeExpiresAt(dto, currentLicense?.expiresAt);
    const requestedStatus = parseLicenseStatus(dto.status);
    const nextStatus = effectiveStatus(
      requestedStatus ?? currentLicense?.status ?? LicenseStatus.TRIAL,
      nextExpiresAt
    );
    const maxStudents =
      dto.maxStudents === undefined || dto.maxStudents === null || Number.isNaN(dto.maxStudents)
        ? currentLicense?.maxStudents ?? null
        : dto.maxStudents;

    if (!currentLicense) {
      // Créer une nouvelle licence
      await this.prisma.license.create({
        data: {
          establishmentId,
          planCode: dto.planCode ?? "trial",
          status: nextStatus,
          expiresAt: nextExpiresAt,
          maxStudents
        }
      });
      return this.findOne(establishmentId);
    }

    // Mettre à jour la licence existante
    await this.prisma.license.update({
      where: { id: currentLicense.id },
      data: {
        planCode: dto.planCode ?? currentLicense.planCode,
        status: nextStatus,
        expiresAt: nextExpiresAt,
        maxStudents,
        lastCheckAt: new Date()
      }
    });
    return this.findOne(establishmentId);
  }

  /**
   * Active ou désactive un module pour un établissement (Super Admin).
   */
  async toggleModule(establishmentId: string, moduleCode: string, enabled: boolean) {
    await this.findOne(establishmentId);
    if (!VALID_MODULE_CODES.has(moduleCode as any)) {
      throw new BadRequestException("Module inconnu.");
    }

    await this.prisma.enabledModule.upsert({
      where: { establishmentId_moduleCode: { establishmentId, moduleCode } },
      create: {
        establishmentId,
        moduleCode,
        enabled,
        source: "admin"
      },
      update: { enabled, source: "admin" }
    });
    return this.findOne(establishmentId);
  }

  /**
   * Change le statut de la licence principale d'un établissement.
   * Utilisé pour suspendre ou réactiver un accès.
   */
  async updateStatus(establishmentId: string, status: string, reason?: string) {
    const establishment = await this.findOne(establishmentId);
    const currentLicense = establishment.licenses[0];

    if (currentLicense) {
      await this.prisma.license.update({
        where: { id: currentLicense.id },
        data: { status: parseLicenseStatus(status), lastCheckAt: new Date() }
      });
    }

    return { success: true, establishment: await this.findOne(establishmentId), status, reason };
  }
}
