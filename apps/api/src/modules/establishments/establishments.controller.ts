import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
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
}
