import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, Length } from "class-validator";

export class CreatePeriodDto {
  @ApiProperty({ example: "2026-2027" })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: "Trimestre 1" })
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiProperty({ example: "TRIMESTER" })
  @IsString()
  @Length(2, 40)
  type!: string;

  @ApiPropertyOptional({ example: "2026-10-01" })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: "2026-12-20" })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
