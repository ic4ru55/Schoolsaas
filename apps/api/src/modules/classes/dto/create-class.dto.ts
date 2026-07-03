import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateClassDto {
  @ApiProperty({ example: "2026-2027" })
  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  levelId?: string;

  @ApiProperty({ example: "6eme A" })
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

