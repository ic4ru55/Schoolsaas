import {
  Controller,
  Get,
  Param,
  Query
} from "@nestjs/common";
import { ApiTags, ApiQuery } from "@nestjs/swagger";
import { AuditLogsService } from "./audit-logs.service";

@ApiTags("audit-logs")
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * GET /api/audit-logs
   * Super Admin uniquement — retourne tous les logs avec filtres optionnels.
   */
  @Get()
  @ApiQuery({ name: "establishmentId", required: false })
  @ApiQuery({ name: "action", required: false })
  @ApiQuery({ name: "entityType", required: false })
  @ApiQuery({ name: "userId", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  findAll(
    @Query("establishmentId") establishmentId?: string,
    @Query("action") action?: string,
    @Query("entityType") entityType?: string,
    @Query("userId") userId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.auditLogsService.findAll({
      establishmentId,
      action,
      entityType,
      userId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50
    });
  }

  /**
   * GET /api/audit-logs/stats
   * Statistiques globales ou par établissement.
   */
  @Get("stats")
  @ApiQuery({ name: "establishmentId", required: false })
  getStats(@Query("establishmentId") establishmentId?: string) {
    return this.auditLogsService.getStats(establishmentId);
  }

  /**
   * GET /api/establishments/:establishmentId/audit-logs
   * Admin local — retourne les logs de son établissement.
   */
  @Get("establishments/:establishmentId")
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  findByEstablishment(
    @Param("establishmentId") establishmentId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.auditLogsService.findByEstablishment(
      establishmentId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50
    );
  }
}
