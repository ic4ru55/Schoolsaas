import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { DEFAULT_ROLES, PERMISSIONS, ROLE_PERMISSION_PRESETS } from "@schoolsaas-bf/shared";
import { PrismaClient } from "@prisma/client";

export async function seedAuth(
  prisma: PrismaClient,
  config: ConfigService
) {
  console.log("[Seed] Vérification des permissions et rôles système...");

  // 1. Seed des permissions en base
  for (const [, code] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code,
        moduleCode: code.split(".")[0]
      }
    });
  }

  // 2. Seed du rôle système platform_super_admin (establishmentId = null)
  // Prisma ne supporte pas null dans un upsert sur un index composite unique,
  // on utilise donc findFirst + create conditionnel.
  const platformRoleData = DEFAULT_ROLES.find(
    (r) => r.code === "platform_super_admin"
  );
  if (platformRoleData) {
    const existingPlatformRole = await prisma.role.findFirst({
      where: { code: "platform_super_admin", establishmentId: null }
    });
    if (!existingPlatformRole) {
      await prisma.role.create({
        data: {
          code: "platform_super_admin",
          name: platformRoleData.label,
          systemRole: true,
          establishmentId: null
        }
      });
      console.log("[Seed] Rôle platform_super_admin créé.");
    }
  }

  // 3. Créer le compte Super Admin si inexistant
  const superAdminEmail = config.get<string>(
    "SUPER_ADMIN_EMAIL",
    "admin@schoolsaas.bf"
  );
  const superAdminPassword = config.get<string>(
    "SUPER_ADMIN_PASSWORD",
    "Admin@2025!"
  );
  const superAdminName = config.get<string>(
    "SUPER_ADMIN_NAME",
    "Super Administrateur"
  );

  let superAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail }
  });

  if (!superAdmin) {
    const passwordHash = await bcrypt.hash(superAdminPassword, 12);
    superAdmin = await prisma.user.create({
      data: {
        fullName: superAdminName,
        email: superAdminEmail,
        passwordHash,
        status: "active"
      }
    });
    console.log(`[Seed] Super Admin créé : ${superAdminEmail}`);
  }

  // 4. Associer le rôle platform_super_admin au super admin
  const platformRole = await prisma.role.findFirst({
    where: { code: "platform_super_admin", establishmentId: null }
  });

  if (platformRole) {
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: superAdmin.id,
        roleId: platformRole.id
      }
    });

    if (!existingUserRole) {
      await prisma.userRole.create({
        data: {
          userId: superAdmin.id,
          roleId: platformRole.id,
          establishmentId: null
        }
      });
      console.log("[Seed] Rôle platform_super_admin assigné au Super Admin.");
    }
  }

  console.log("[Seed] Auth seed terminé.");
}

/**
 * Seed les rôles par défaut pour un établissement nouvellement créé.
 * À appeler lors de la création d'un établissement.
 */
export async function seedEstablishmentRoles(
  prisma: PrismaClient,
  establishmentId: string
) {
  const permissionsInDb = await prisma.permission.findMany();
  const permissionByCode = new Map(permissionsInDb.map((p) => [p.code, p]));

  for (const roleData of DEFAULT_ROLES.filter((r) => r.scope === "establishment")) {
    const role = await prisma.role.upsert({
      where: {
        establishmentId_code: {
          establishmentId,
          code: roleData.code
        }
      },
      update: {},
      create: {
        code: roleData.code,
        name: roleData.label,
        systemRole: true,
        establishmentId
      }
    });

    // Associer les permissions du preset
    const presetPerms =
      ROLE_PERMISSION_PRESETS[roleData.code as keyof typeof ROLE_PERMISSION_PRESETS] ?? [];
    for (const permCode of presetPerms) {
      const perm = permissionByCode.get(permCode);
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id }
      });
    }
  }
}
