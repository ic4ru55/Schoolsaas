import { PartialType } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Length, Matches, Max, Min } from "class-validator";
import { CreateEstablishmentDto } from "./create-establishment.dto";

export class UpdateEstablishmentDto extends PartialType(CreateEstablishmentDto) {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(3, 8)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(0, 180)
  motto?: string;

  @IsOptional()
  @IsString()
  @Length(2, 12)
  @Matches(/^[A-Z0-9]+$/, {
    message: "Le prefixe du matricule doit contenir seulement des lettres majuscules et des chiffres."
  })
  studentMatriculePrefix?: string;

  @IsOptional()
  @IsString()
  @Length(5, 80)
  @Matches(/^[A-Z0-9{}_\-/.]+$/, {
    message: "Le format du matricule contient des caracteres non autorises."
  })
  @Matches(/\{SEQ\}/, {
    message: "Le format du matricule doit contenir le jeton {SEQ}."
  })
  studentMatriculeFormat?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99999999)
  studentMatriculeNextNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  studentMatriculePadding?: number;
}
