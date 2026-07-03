import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateStudentDocumentDto {
  @ApiProperty({ example: "BIRTH_CERTIFICATE" })
  @IsString()
  @Matches(/^(BIRTH_CERTIFICATE|PHOTO|PREVIOUS_REPORT|CERTIFICATE|GUARDIAN_ID|OTHER)$/, {
    message: "Le type de document n'est pas autorise."
  })
  documentType!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  label?: string;

  @ApiProperty({ example: "acte-naissance.pdf" })
  @IsString()
  @Length(2, 180)
  originalName!: string;

  @ApiProperty({ example: "application/pdf" })
  @IsString()
  @Matches(/^(application\/pdf|image\/jpeg|image\/png|image\/webp)$/, {
    message: "Le fichier doit etre un PDF ou une image JPG, PNG, WEBP."
  })
  mimeType!: string;

  @ApiProperty({ example: "JVBERi0x..." })
  @IsString()
  base64Content!: string;
}
