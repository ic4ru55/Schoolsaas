import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";

export class CreateSubjectDto {
  @ApiProperty({ example: "Mathematiques" })
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  subjectGroup?: string;
}

