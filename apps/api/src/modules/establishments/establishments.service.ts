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

@Injectable()
export class EstablishmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.establishment.findMany({
      orderBy: { createdAt: "desc" },
      include: establishmentInclude()
    });
  }

  async findOne(id: string) {
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
              status: "TRIAL"
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
    }
  ) {
    const establishment = await this.findOne(establishmentId);
    const currentLicense = establishment.licenses[0];

    if (!currentLicense) {
      // Créer une nouvelle licence
      return this.prisma.license.create({
        data: {
          establishmentId,
          planCode: dto.planCode ?? "trial",
          status: (dto.status as any) ?? "TRIAL",
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          maxStudents: dto.maxStudents
        }
      });
    }

    // Mettre à jour la licence existante
    return this.prisma.license.update({
      where: { id: currentLicense.id },
      data: {
        planCode: dto.planCode ?? currentLicense.planCode,
        status: (dto.status as any) ?? currentLicense.status,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : currentLicense.expiresAt,
        maxStudents: dto.maxStudents ?? currentLicense.maxStudents,
        lastCheckAt: new Date()
      }
    });
  }

  /**
   * Active ou désactive un module pour un établissement (Super Admin).
   */
  async toggleModule(establishmentId: string, moduleCode: string, enabled: boolean) {
    await this.findOne(establishmentId);

    return this.prisma.enabledModule.upsert({
      where: { establishmentId_moduleCode: { establishmentId, moduleCode } },
      create: {
        establishmentId,
        moduleCode,
        enabled,
        source: "admin"
      },
      update: { enabled }
    });
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
        data: { status: status as any, lastCheckAt: new Date() }
      });
    }

    return { success: true, establishmentId, status, reason };
  }
}

