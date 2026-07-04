import { Global, Module } from "@nestjs/common";
import { AuditLogsController } from "./audit-logs.controller";
import { AuditLogsService } from "./audit-logs.service";

/**
 * Module global — AuditLogsService peut être injecté dans n'importe quel
 * autre module NestJS sans redéclarer l'import.
 */
@Global()
@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService]
})
export class AuditLogsModule {}
