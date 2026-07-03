import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateLevelDto {
  @ApiProperty({ example: "6eme" })
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

