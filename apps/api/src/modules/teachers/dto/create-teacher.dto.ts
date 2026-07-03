import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsNumber, IsOptional, IsString, Length, Matches, Min } from "class-validator";

export class CreateTeacherDto {
  @ApiProperty({ example: "Moussa" })
  @IsString()
  @Length(2, 80)
  firstName!: string;

  @ApiProperty({ example: "Ouedraogo" })
  @IsString()
  @Length(2, 80)
  lastName!: string;

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
    message: "L'adresse email doit contenir un domaine valide."
  })
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(permanent|vacataire|contractuel|stagiaire)$/, {
    message: "Le type d'emploi n'est pas autorise."
  })
  employmentType?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(active|inactive|suspended)$/, {
    message: "Le statut de l'enseignant n'est pas autorise."
  })
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate?: number;
}
