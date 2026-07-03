import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateStudentDocumentDto } from "./dto/create-student-document.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { StudentsService } from "./students.service";

@ApiTags("students")
@Controller("establishments/:establishmentId/students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll(
    @Param("establishmentId") establishmentId: string,
    @Query("search") search?: string
  ) {
    return this.studentsService.findAll(establishmentId, search);
  }

  @Post()
  create(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CreateStudentDto
  ) {
    return this.studentsService.create(establishmentId, dto);
  }

  @Get(":studentId/documents")
  findDocuments(
    @Param("establishmentId") establishmentId: string,
    @Param("studentId") studentId: string
  ) {
    return this.studentsService.findDocuments(establishmentId, studentId);
  }

  @Post(":studentId/documents")
  uploadDocument(
    @Param("establishmentId") establishmentId: string,
    @Param("studentId") studentId: string,
    @Body() dto: CreateStudentDocumentDto
  ) {
    return this.studentsService.uploadDocument(establishmentId, studentId, dto);
  }
}
