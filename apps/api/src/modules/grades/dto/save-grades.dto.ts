import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested
} from "class-validator";

export class GradeEntryDto {
  @ApiProperty({ example: "student-id" })
  @IsString()
  studentId!: string;

  @ApiProperty({ example: 15.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;

  @ApiPropertyOptional({ example: "Bon travail" })
  @IsOptional()
  @IsString()
  @Length(0, 240)
  comment?: string;
}

export class SaveGradesDto {
  @ApiProperty({ example: "assessment-id" })
  @IsString()
  assessmentId!: string;

  @ApiPropertyOptional({ example: "Surveillant general" })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  enteredBy?: string;

  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => GradeEntryDto)
  grades!: GradeEntryDto[];
}
