import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsObject, IsOptional, IsString } from "class-validator";

export class StartImportDto {
  @ApiProperty({ example: "STUDENT" })
  @IsString()
  type!: string; // ex: "STUDENT"

  @ApiProperty({ example: {} })
  @IsObject()
  mapping!: Record<string, string>;

  @ApiProperty({ example: [] })
  @IsArray()
  rows!: Record<string, any>[];

  @ApiPropertyOptional({ example: "class-uuid" })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ example: "Admin" })
  @IsOptional()
  @IsString()
  startedBy?: string;
}
