import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PERMISSIONS } from "@schoolsaas-bf/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { JwtPayload } from "./jwt.strategy";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditLogs: AuditLogsService
  ) {}


  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("Email ou mot de passe incorrect.");
    }

    if (user.status !== "active") {
      throw new UnauthorizedException("Ce compte est désactivé.");
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException("Email ou mot de passe incorrect.");
    }

    // Déterminer le scope : super admin plateforme ou utilisateur établissement
    const platformRole = user.roles.find(
      (ur) => !ur.establishmentId && ur.role.code === "platform_super_admin"
    );

    let scope: "platform" | "establishment";
    let establishmentId: string | null;
    let roleCode: string;
    let permissions: string[];

    if (platformRole) {
      scope = "platform";
      establishmentId = null;
      roleCode = "platform_super_admin";
      permissions = Object.values(PERMISSIONS);
    } else {
      // Prendre le premier rôle établissement actif
      const estabRole = user.roles.find((ur) => ur.establishmentId);
      if (!estabRole) {
        throw new UnauthorizedException("Aucun rôle trouvé pour ce compte.");
      }
      scope = "establishment";
      establishmentId = estabRole.establishmentId;
      roleCode = estabRole.role.code;
      permissions = estabRole.role.permissions.map((rp) => rp.permission.code);
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      scope,
      establishmentId,
      permissions,
      roleCode
    };

    const token = this.jwt.sign(payload);

    // Mettre à jour lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Audit log — connexion réussie
    await this.auditLogs.log({
      establishmentId,
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entityType: "User",
      entityId: user.id,
      newValues: { email: user.email, scope, roleCode }
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        scope,
        establishmentId,
        roleCode,
        permissions
      }
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } }
              }
            }
          }
        }
      }
    });

    if (!user) throw new UnauthorizedException("Utilisateur introuvable.");

    const platformRole = user.roles.find(
      (ur) => !ur.establishmentId && ur.role.code === "platform_super_admin"
    );

    const scope: "platform" | "establishment" = platformRole
      ? "platform"
      : "establishment";
    const estabRole = user.roles.find((ur) => ur.establishmentId);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      scope,
      establishmentId: estabRole?.establishmentId ?? null,
      roleCode: platformRole
        ? "platform_super_admin"
        : estabRole?.role.code ?? "",
      permissions: platformRole
        ? Object.values(PERMISSIONS)
        : (estabRole?.role.permissions.map((rp) => rp.permission.code) ?? [])
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("Utilisateur introuvable.");

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok)
      throw new BadRequestException("Mot de passe actuel incorrect.");

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash }
    });

    // Audit log — changement de mot de passe
    await this.auditLogs.log({
      userId,
      action: "PASSWORD_CHANGE",
      entityType: "User",
      entityId: userId
    });

    return { success: true };
  }
}
