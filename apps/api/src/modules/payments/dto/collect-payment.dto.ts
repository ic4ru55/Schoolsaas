import { PaymentMethod } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class CollectPaymentDto {
  @ApiProperty({ example: "student-id" })
  @IsString()
  studentId!: string;

  @ApiProperty({ example: "academic-year-id" })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: 15000 })
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amount!: number;

  @ApiProperty({ example: "CASH" })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  reference?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  receivedBy?: string;
}
