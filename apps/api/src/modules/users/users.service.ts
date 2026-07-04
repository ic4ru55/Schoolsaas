import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { seedEstablishmentRoles } from "../auth/auth.seed";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService
  ) {}

  async findAll(establishmentId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { establishmentId },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, status: true, lastLoginAt: true, createdAt: true } },
        role: { select: { id: true, code: true, name: true } }
      },
      orderBy: { user: { fullName: "asc" } }
    });

    return userRoles.map((ur) => ({
      id: ur.user.id,
      fullName: ur.user.fullName,
      email: ur.user.email,
      phone: ur.user.phone,
      status: ur.user.status,
      lastLoginAt: ur.user.lastLoginAt,
      createdAt: ur.user.createdAt,
      roleId: ur.role.id,
      roleCode: ur.role.code,
      roleName: ur.role.name,
      userRoleId: ur.id
    }));
  }

  async findAvailableRoles(establishmentId: string) {
    // S'assurer que les rôles de l'établissement existent
    const roles = await this.prisma.role.findMany({
      where: { establishmentId, systemRole: true },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
    if (roles.length === 0) {
      await seedEstablishmentRoles(this.prisma as any, establishmentId);
      return this.prisma.role.findMany({
        where: { establishmentId },
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });
    }
    return roles;
  }

  async create(
    establishmentId: string,
    data: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      roleId: string;
    }
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() }
    });
    if (existing) {
      throw new BadRequestException("Cet email est déjà utilisé.");
    }

    const role = await this.prisma.role.findFirst({
      where: { id: data.roleId, establishmentId }
    });
    if (!role) {
      throw new BadRequestException("Rôle introuvable.");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone?.trim() || null,
        passwordHash,
        status: "active"
      }
    });

    await this.prisma.userRole.create({
      data: { userId: user.id, roleId: data.roleId, establishmentId }
    });

    // Audit log — création utilisateur
    await this.auditLogs.log({
      establishmentId,
      userId: user.id,
      action: "USER_CREATE",
      entityType: "User",
      entityId: user.id,
      newValues: { fullName: user.fullName, email: user.email, roleId: data.roleId }
    });

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      roleCode: role.code,
      roleName: role.name
    };
  }

  async update(
    establishmentId: string,
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
      roleId?: string;
      status?: string;
      newPassword?: string;
    }
  ) {
    const userRole = await this.prisma.userRole.findFirst({
      where: { userId, establishmentId }
    });
    if (!userRole) throw new NotFoundException("Utilisateur introuvable.");

    const updates: any = {};
    if (data.fullName) updates.fullName = data.fullName.trim();
    if (data.phone !== undefined) updates.phone = data.phone?.trim() || null;
    if (data.status) updates.status = data.status;
    if (data.newPassword) {
      updates.passwordHash = await bcrypt.hash(data.newPassword, 12);
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: updates });
    }

    // Changer de rôle si demandé
    if (data.roleId) {
      const role = await this.prisma.role.findFirst({
        where: { id: data.roleId, establishmentId }
      });
      if (!role) throw new BadRequestException("Rôle introuvable.");
      await this.prisma.userRole.update({
        where: { id: userRole.id },
        data: { roleId: data.roleId }
      });
    }

    // Audit log — modification utilisateur
    await this.auditLogs.log({
      establishmentId,
      userId,
      action: "USER_UPDATE",
      entityType: "User",
      entityId: userId,
      newValues: { status: data.status, roleId: data.roleId }
    });

    return { success: true };
  }

  async remove(establishmentId: string, userId: string) {
    const userRole = await this.prisma.userRole.findFirst({
      where: { userId, establishmentId }
    });
    if (!userRole) throw new NotFoundException("Utilisateur introuvable.");

    // Désactivation plutôt que suppression
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: "inactive" }
    });

    // Audit log — désactivation utilisateur
    await this.auditLogs.log({
      establishmentId,
      userId,
      action: "USER_DEACTIVATE",
      entityType: "User",
      entityId: userId
    });

    return { success: true };
  }

  async updateRolePermissions(
    establishmentId: string,
    roleId: string,
    permissionCodes: string[]
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, establishmentId }
    });
    if (!role) {
      throw new NotFoundException("Rôle introuvable pour cet établissement.");
    }

    // On évite de modifier le super admin ou un rôle non lié à l'établissement (sécurité supplémentaire)
    if (role.code === "platform_super_admin") {
      throw new BadRequestException("Les permissions du Super Administrateur ne peuvent pas être modifiées.");
    }

    // Récupérer toutes les permissions correspondant aux codes demandés
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } }
    });

    // Mettre à jour les permissions du rôle en supprimant puis recréant les liaisons
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: { roleId: role.id }
      }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: role.id,
          permissionId: p.id
        }))
      })
    ]);

    // Audit log
    await this.auditLogs.log({
      establishmentId,
      userId: null,
      action: "ROLE_UPDATE_PERMISSIONS",
      entityType: "Role",
      entityId: roleId,
      newValues: { roleCode: role.code, roleName: role.name, permissionCodes }
    });

    return { success: true };
  }
}
