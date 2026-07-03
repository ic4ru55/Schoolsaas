import { Injectable, NotFoundException } from "@nestjs/common";
import {
  DEFAULT_ROLES,
  MVP_MODULES,
  PERMISSIONS,
  ROLE_PERMISSION_PRESETS
} from "@schoolsaas-bf/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEstablishmentDto } from "./dto/create-establishment.dto";
import { UpdateEstablishmentDto } from "./dto/update-establishment.dto";

@Injectable()
export class EstablishmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.establishment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        academicYears: { orderBy: { startsAt: "desc" } },
        licenses: { orderBy: { createdAt: "desc" }, take: 1 },
        modules: true
      }
    });
  }

  async findOne(id: string) {
    const establishment = await this.prisma.establishment.findUnique({
      where: { id },
      include: {
        academicYears: { orderBy: { startsAt: "desc" } },
        modules: true,
        licenses: { orderBy: { createdAt: "desc" }, take: 1 }
      }
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
        include: {
          academicYears: true,
          licenses: true,
          modules: true
        }
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
      include: {
        academicYears: { orderBy: { startsAt: "desc" } },
        licenses: { orderBy: { createdAt: "desc" }, take: 1 },
        modules: true
      }
    });
  }
}
