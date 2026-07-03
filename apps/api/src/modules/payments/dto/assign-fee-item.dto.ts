import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class AssignFeeItemDto {
  @ApiProperty({ example: "ALL_ACTIVE" })
  @IsIn(["ALL_ACTIVE", "CLASS", "STUDENT"])
  target!: "ALL_ACTIVE" | "CLASS" | "STUDENT";

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;
}
