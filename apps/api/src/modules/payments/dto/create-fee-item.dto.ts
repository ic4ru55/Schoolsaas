import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min
} from "class-validator";

export class CreateFeeItemDto {
  @ApiProperty({ example: "2026-2027" })
  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  levelId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty({ example: "Scolarite - tranche 1" })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 25000 })
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amount!: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}
