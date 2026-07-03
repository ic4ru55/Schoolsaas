import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";

export class UploadEstablishmentAssetDto {
  @ApiProperty({ enum: ["LOGO", "STAMP"], example: "LOGO" })
  @IsString()
  @Matches(/^(LOGO|STAMP)$/, {
    message: "Le type d'image doit etre LOGO ou STAMP."
  })
  assetType!: "LOGO" | "STAMP";

  @ApiProperty({ example: "logo-ecole.png" })
  @IsString()
  @Length(2, 180)
  originalName!: string;

  @ApiProperty({ example: "image/png" })
  @IsString()
  @Matches(/^(image\/jpeg|image\/png|image\/webp)$/, {
    message: "L'image doit etre au format JPG, PNG ou WEBP."
  })
  mimeType!: string;

  @ApiProperty({ example: "iVBORw0KGgo..." })
  @IsString()
  base64Content!: string;
}
