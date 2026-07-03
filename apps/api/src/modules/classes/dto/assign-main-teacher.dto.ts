import { IsOptional, IsString } from "class-validator";

export class AssignMainTeacherDto {
  @IsOptional()
  @IsString()
  teacherId?: string;
}
