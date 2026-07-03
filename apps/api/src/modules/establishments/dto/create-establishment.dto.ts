import { ApiProperty } from "@nestjs/swagger";
import { EstablishmentType } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches
} from "class-validator";

export class CreateEstablishmentDto {
  @ApiProperty({ example: "Lycee Wend-Panga" })
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty({ enum: EstablishmentType, example: EstablishmentType.HIGH_SCHOOL })
  @IsEnum(EstablishmentType)
  type!: EstablishmentType;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, {
    message: "Le telephone doit contenir exactement 8 chiffres."
  })
  phone?: string;

  @IsOptional()
  @IsEmail(
    {},
    {
      message: "L'adresse email n'est pas valide."
    }
  )
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, {
    message: "L'adresse email doit contenir un domaine valide, par exemple contact@ecole.bf."
  })
  email?: string;
}
