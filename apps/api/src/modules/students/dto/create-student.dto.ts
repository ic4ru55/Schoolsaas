import { ApiProperty } from "@nestjs/swagger";
import { EnrollmentType, Gender } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested
} from "class-validator";

export class CreateStudentGuardianDto {
  @ApiProperty({ example: "Moussa" })
  @IsString()
  @Length(2, 80)
  firstName!: string;

  @ApiProperty({ example: "Ouedraogo" })
  @IsString()
  @Length(2, 80)
  lastName!: string;

  @ApiProperty({ example: "Pere" })
  @IsString()
  @Length(2, 40)
  relationship!: string;

  @ApiProperty({ example: "72007342" })
  @IsString()
  @Matches(/^\d{8}$/, {
    message: "Le telephone du responsable doit contenir exactement 8 chiffres."
  })
  phone!: string;

  @IsOptional()
  @IsEmail(
    {},
    {
      message: "L'adresse email du responsable n'est pas valide."
    }
  )
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, {
    message: "L'adresse email du responsable doit contenir un domaine valide."
  })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateStudentDto {
  @ApiProperty({ example: "Aminata" })
  @IsString()
  @Length(2, 80)
  firstName!: string;

  @ApiProperty({ example: "Ouedraogo" })
  @IsString()
  @Length(2, 80)
  lastName!: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsEnum(EnrollmentType)
  enrollmentType?: EnrollmentType;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateStudentGuardianDto)
  guardians?: CreateStudentGuardianDto[];
}
