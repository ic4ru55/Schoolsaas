import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AcademicYearsModule } from "./modules/academic-years/academic-years.module";
import { ClassesModule } from "./modules/classes/classes.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { EstablishmentsModule } from "./modules/establishments/establishments.module";
import { HealthModule } from "./modules/health/health.module";
import { LevelsModule } from "./modules/levels/levels.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { StudentsModule } from "./modules/students/students.module";
import { SubjectsModule } from "./modules/subjects/subjects.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    DashboardModule,
    EstablishmentsModule,
    AcademicYearsModule,
    LevelsModule,
    ClassesModule,
    SubjectsModule,
    StudentsModule,
    PaymentsModule
  ],
  controllers: [AppController]
})
export class AppModule {}
