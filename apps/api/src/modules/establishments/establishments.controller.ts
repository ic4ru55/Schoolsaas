import { Body, Controller, Get, Param, Patch, Post, Delete, Query } from "@nestjs/common";
import { ApiTags, ApiQuery } from "@nestjs/swagger";
import { CreateEstablishmentDto } from "./dto/create-establishment.dto";
import { UpdateEstablishmentDto } from "./dto/update-establishment.dto";
import { UploadEstablishmentAssetDto } from "./dto/upload-establishment-asset.dto";
import { EstablishmentsService } from "./establishments.service";

@ApiTags("establishments")
@Controller("establishments")
export class EstablishmentsController {
  constructor(private readonly establishmentsService: EstablishmentsService) {}

  @Get()
  findAll() {
    return this.establishmentsService.findAll();
  }

  /**
   * GET /api/establishments/stats
   * Super Admin — statistiques globales de la plateforme.
   */
  @Get("stats")
  getPlatformStats() {
    return this.establishmentsService.getPlatformStats();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.establishmentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEstablishmentDto) {
    return this.establishmentsService.create(dto);
  }

  @Get(":id/assets/:assetType/:fileName")
  getAssetFile(
    @Param("id") id: string,
    @Param("assetType") assetType: string,
    @Param("fileName") fileName: string
  ) {
    return this.establishmentsService.getAssetFile(id, assetType, fileName);
  }

  @Post(":id/assets")
  uploadAsset(@Param("id") id: string, @Body() dto: UploadEstablishmentAssetDto) {
    return this.establishmentsService.uploadAsset(id, dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateEstablishmentDto) {
    return this.establishmentsService.update(id, dto);
  }

  /**
   * PATCH /api/establishments/:id/license
   * Super Admin — met à jour le statut et les paramètres de la licence.
   */
  @Patch(":id/license")
  updateLicense(
    @Param("id") id: string,
    @Body() dto: {
      planCode?: string;
      status?: string;
      expiresAt?: string;
      maxStudents?: number;
    }
  ) {
    return this.establishmentsService.updateLicense(id, dto);
  }

  /**
   * PATCH /api/establishments/:id/modules/:moduleCode
   * Super Admin — active ou désactive un module pour un établissement.
   */
  @Patch(":id/modules/:moduleCode")
  toggleModule(
    @Param("id") id: string,
    @Param("moduleCode") moduleCode: string,
    @Body() dto: { enabled: boolean }
  ) {
    return this.establishmentsService.toggleModule(id, moduleCode, dto.enabled);
  }

  /**
   * PATCH /api/establishments/:id/status
   * Super Admin — active ou suspend un établissement.
   */
  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: { status: string; reason?: string }
  ) {
    return this.establishmentsService.updateStatus(id, dto.status, dto.reason);
  }
}
