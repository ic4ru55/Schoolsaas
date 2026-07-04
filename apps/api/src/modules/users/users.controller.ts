import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UsersService } from "./users.service";

@ApiTags("users")
@UseGuards(JwtAuthGuard)
@Controller("establishments/:establishmentId/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Param("establishmentId") establishmentId: string) {
    return this.usersService.findAll(establishmentId);
  }

  @Get("roles")
  findRoles(@Param("establishmentId") establishmentId: string) {
    return this.usersService.findAvailableRoles(establishmentId);
  }

  @Patch("roles/:roleId/permissions")
  updateRolePermissions(
    @Param("establishmentId") establishmentId: string,
    @Param("roleId") roleId: string,
    @Body() body: { permissionCodes: string[] }
  ) {
    return this.usersService.updateRolePermissions(establishmentId, roleId, body.permissionCodes);
  }

  @Post()
  create(
    @Param("establishmentId") establishmentId: string,
    @Body()
    body: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      roleId: string;
    }
  ) {
    return this.usersService.create(establishmentId, body);
  }

  @Patch(":userId")
  update(
    @Param("establishmentId") establishmentId: string,
    @Param("userId") userId: string,
    @Body()
    body: {
      fullName?: string;
      phone?: string;
      roleId?: string;
      status?: string;
      newPassword?: string;
    }
  ) {
    return this.usersService.update(establishmentId, userId, body);
  }

  @Delete(":userId")
  remove(
    @Param("establishmentId") establishmentId: string,
    @Param("userId") userId: string
  ) {
    return this.usersService.remove(establishmentId, userId);
  }
}
