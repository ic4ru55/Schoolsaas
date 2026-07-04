import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AcademicYearsModule } from "./modules/academic-years/academic-years.module";
import { ClassesModule } from "./modules/classes/classes.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { EstablishmentsModule } from "./modules/establishments/establishments.module";
import { GradesModule } from "./modules/grades/grades.module";
import { HealthModule } from "./modules/health/health.module";
import { LevelsModule } from "./modules/levels/levels.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { StudentsModule } from "./modules/students/students.module";
import { SubjectsModule } from "./modules/subjects/subjects.module";
import { TeachersModule } from "./modules/teachers/teachers.module";
import { ImportsModule } from "./modules/imports/imports.module";
import { BackupsModule } from "./modules/backups/backups.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditLogsModule,       // Global — doit être avant les modules qui l'utilisent
    HealthModule,
    DashboardModule,
    EstablishmentsModule,
    AcademicYearsModule,
    LevelsModule,
    ClassesModule,
    SubjectsModule,
    TeachersModule,
    StudentsModule,
    PaymentsModule,
    GradesModule,
    ImportsModule,
    BackupsModule,
    AuthModule,
    UsersModule
  ],
  controllers: [AppController]
})
export class AppModule {}
