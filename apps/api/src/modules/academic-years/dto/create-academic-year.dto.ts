import { ApiProperty } from "@nestjs/swagger";
import { AcademicYearStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, Length } from "class-validator";

export class CreateAcademicYearDto {
  @ApiProperty({ example: "2026-2027" })
  @IsString()
  @Length(4, 30)
  name!: string;

  @ApiProperty({ example: "2026-09-01" })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: "2027-07-31" })
  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsEnum(AcademicYearStatus)
  status?: AcademicYearStatus;
}

