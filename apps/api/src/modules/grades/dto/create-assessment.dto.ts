import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class CreateAssessmentDto {
  @ApiProperty({ example: "period-id" })
  @IsString()
  periodId!: string;

  @ApiProperty({ example: "class-subject-id" })
  @IsString()
  classSubjectId!: string;

  @ApiProperty({ example: "Devoir 1" })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(20)
  weight?: number;
}
