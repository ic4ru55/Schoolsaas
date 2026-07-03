import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";

export class UploadEstablishmentAssetDto {
  @ApiProperty({
    enum: ["LOGO", "STAMP", "DIRECTOR_SIGNATURE", "CASHIER_SIGNATURE"],
    example: "LOGO"
  })
  @IsString()
  @Matches(/^(LOGO|STAMP|DIRECTOR_SIGNATURE|CASHIER_SIGNATURE)$/, {
    message: "Le type d'image doit etre LOGO, STAMP, DIRECTOR_SIGNATURE ou CASHIER_SIGNATURE."
  })
  assetType!: "LOGO" | "STAMP" | "DIRECTOR_SIGNATURE" | "CASHIER_SIGNATURE";

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
