import { Controller, Delete, Get, Param, Post, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { BackupsService } from "./backups.service";

@ApiTags("backups")
@Controller("establishments/:establishmentId/backups")
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  findAll(@Param("establishmentId") establishmentId: string) {
    return this.backupsService.findAll(establishmentId);
  }

  @Post()
  startManualBackup(@Param("establishmentId") establishmentId: string) {
    return this.backupsService.startManualBackup(establishmentId);
  }

  @Get(":backupId/download")
  async download(
    @Param("establishmentId") establishmentId: string,
    @Param("backupId") backupId: string,
    @Res() res: Response
  ) {
    const { filePath, fileName } = await this.backupsService.downloadBackup(
      establishmentId,
      backupId
    );
    res.download(filePath, fileName);
  }

  @Post(":backupId/restore")
  restore(
    @Param("establishmentId") establishmentId: string,
    @Param("backupId") backupId: string
  ) {
    return this.backupsService.restoreBackup(establishmentId, backupId);
  }

  @Delete(":backupId")
  async remove(
    @Param("establishmentId") establishmentId: string,
    @Param("backupId") backupId: string
  ) {
    return this.backupsService.deleteBackup(establishmentId, backupId);
  }
}
