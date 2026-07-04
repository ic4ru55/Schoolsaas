import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import { CreatePeriodDto } from "./dto/create-period.dto";
import { SaveGradesDto } from "./dto/save-grades.dto";

function money(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function normalizeAssessment(assessment: any) {
  return {
    ...assessment,
    maxScore: money(assessment.maxScore),
    weight: money(assessment.weight),
    classSubject: assessment.classSubject
      ? {
          ...assessment.classSubject,
          coefficient: money(assessment.classSubject.coefficient)
        }
      : assessment.classSubject,
    grades:
      assessment.grades?.map((grade: any) => ({
        ...grade,
        score: money(grade.score)
      })) ?? []
  };
}

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveAcademicYear(establishmentId: string, academicYearId?: string) {
    const academicYear = academicYearId
      ? await this.prisma.academicYear.findFirst({
          where: { id: academicYearId, establishmentId }
        })
      : await this.prisma.academicYear.findFirst({
          where: { establishmentId, status: "ACTIVE" },
          orderBy: { startsAt: "desc" }
        });

    if (!academicYear) {
      throw new NotFoundException("Annee scolaire introuvable pour les notes.");
    }

    return academicYear;
  }

  async overview(
    establishmentId: string,
    academicYearId?: string,
    classId?: string,
    periodId?: string
  ) {
    const academicYear = await this.resolveAcademicYear(establishmentId, academicYearId);
    const periods = await this.prisma.period.findMany({
      where: { establishmentId, academicYearId: academicYear.id },
      orderBy: [{ startsAt: "asc" }, { name: "asc" }]
    });
    const classes = await this.prisma.schoolClass.findMany({
      where: { establishmentId, academicYearId: academicYear.id },
      include: {
        level: true,
        mainTeacher: true,
        classSubjects: {
          include: {
            subject: true,
            teacher: true
          },
          orderBy: {
            subject: {
              name: "asc"
            }
          }
        },
        enrollments: {
          where: {
            academicYearId: academicYear.id,
            status: "ACTIVE"
          },
          include: {
            student: true
          },
          orderBy: {
            enrolledAt: "asc"
          }
        }
      },
      orderBy: { name: "asc" }
    });

    const selectedClassId =
      classId && classes.some((schoolClass) => schoolClass.id === classId)
        ? classId
        : classes[0]?.id ?? "";
    const selectedClass = classes.find((schoolClass) => schoolClass.id === selectedClassId) ?? null;
    const selectedPeriodId =
      periodId && periods.some((period) => period.id === periodId)
        ? periodId
        : periods[0]?.id ?? "";
    const students = selectedClass
      ? selectedClass.enrollments
          .map((enrollment) => enrollment.student)
          .sort(
            (left, right) =>
              left.lastName.localeCompare(right.lastName) ||
              left.firstName.localeCompare(right.firstName)
          )
      : [];
    const assessments = await this.prisma.assessment.findMany({
      where: {
        establishmentId,
        academicYearId: academicYear.id,
        ...(selectedPeriodId ? { periodId: selectedPeriodId } : {}),
        ...(selectedClassId
          ? {
              classSubject: {
                classId: selectedClassId
              }
            }
          : {})
      },
      include: {
        period: true,
        classSubject: {
          include: {
            class: true,
            subject: true,
            teacher: true
          }
        },
        grades: {
          include: {
            student: true
          },
          orderBy: {
            student: {
              lastName: "asc"
            }
          }
        }
      },
      orderBy: [{ createdAt: "desc" }, { name: "asc" }]
    });

    return {
      academicYear,
      periods,
      classes: classes.map((schoolClass) => ({
        ...schoolClass,
        classSubjects: schoolClass.classSubjects.map((classSubject) => ({
          ...classSubject,
          coefficient: money(classSubject.coefficient)
        }))
      })),
      selectedClassId,
      selectedPeriodId,
      students,
      assessments: assessments.map(normalizeAssessment)
    };
  }

  async createPeriod(establishmentId: string, dto: CreatePeriodDto) {
    const academicYear = await this.resolveAcademicYear(establishmentId, dto.academicYearId);

    return this.prisma.period.create({
      data: {
        establishmentId,
        academicYearId: academicYear.id,
        name: dto.name.trim(),
        type: dto.type.trim().toUpperCase(),
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined
      }
    });
  }

  async createAssessment(establishmentId: string, dto: CreateAssessmentDto) {
    const period = await this.prisma.period.findFirst({
      where: { id: dto.periodId, establishmentId }
    });

    if (!period) {
      throw new BadRequestException("La periode indiquee est introuvable.");
    }

    if (period.lockedAt) {
      throw new BadRequestException("La periode est verrouillee.");
    }

    const classSubject = await this.prisma.classSubject.findFirst({
      where: { id: dto.classSubjectId, establishmentId },
      include: {
        class: true
      }
    });

    if (!classSubject) {
      throw new BadRequestException("La matiere de classe indiquee est introuvable.");
    }

    if (classSubject.class.academicYearId !== period.academicYearId) {
      throw new BadRequestException("La matiere ne correspond pas a l'annee de la periode.");
    }

    return this.prisma.assessment.create({
      data: {
        establishmentId,
        academicYearId: period.academicYearId,
        periodId: period.id,
        classSubjectId: classSubject.id,
        name: dto.name.trim(),
        maxScore: dto.maxScore ?? 20,
        weight: dto.weight ?? 1
      },
      include: {
        period: true,
        classSubject: {
          include: {
            class: true,
            subject: true,
            teacher: true
          }
        },
        grades: true
      }
    });
  }

  async saveGrades(establishmentId: string, dto: SaveGradesDto) {
    if (!dto.grades.length) {
      throw new BadRequestException("Aucune note a enregistrer.");
    }

    return this.prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.findFirst({
        where: { id: dto.assessmentId, establishmentId },
        include: {
          period: true,
          classSubject: {
            include: {
              class: true
            }
          }
        }
      });

      if (!assessment) {
        throw new BadRequestException("L'evaluation indiquee est introuvable.");
      }

      if (assessment.lockedAt || assessment.period.lockedAt) {
        throw new BadRequestException("Cette evaluation ou periode est verrouillee.");
      }

      const maxScore = money(assessment.maxScore);
      const studentIds = [...new Set(dto.grades.map((grade) => grade.studentId))];
      const enrollments = await tx.enrollment.findMany({
        where: {
          establishmentId,
          academicYearId: assessment.academicYearId,
          classId: assessment.classSubject.classId,
          studentId: { in: studentIds },
          status: "ACTIVE"
        },
        select: {
          studentId: true
        }
      });
      const enrolledStudentIds = new Set(enrollments.map((enrollment) => enrollment.studentId));

      if (enrolledStudentIds.size !== studentIds.length) {
        throw new BadRequestException("Une note concerne un eleve hors de cette classe.");
      }

      for (const gradeEntry of dto.grades) {
        if (gradeEntry.score > maxScore) {
          throw new BadRequestException(`La note ne peut pas depasser ${maxScore}.`);
        }

        const existing = await tx.grade.findUnique({
          where: {
            assessmentId_studentId: {
              assessmentId: assessment.id,
              studentId: gradeEntry.studentId
            }
          }
        });

        if (existing) {
          const oldScore = money(existing.score);
          const newScore = gradeEntry.score;
          const updated = await tx.grade.update({
            where: { id: existing.id },
            data: {
              score: newScore,
              comment: gradeEntry.comment?.trim() || null,
              enteredBy: dto.enteredBy?.trim() || existing.enteredBy
            }
          });

          if (oldScore !== newScore) {
            await tx.gradeChangeLog.create({
              data: {
                establishmentId,
                gradeId: updated.id,
                changedBy: dto.enteredBy?.trim(),
                oldScore,
                newScore,
                reason: "Correction de note"
              }
            });
          }
        } else {
          await tx.grade.create({
            data: {
              establishmentId,
              assessmentId: assessment.id,
              studentId: gradeEntry.studentId,
              score: gradeEntry.score,
              comment: gradeEntry.comment?.trim() || null,
              enteredBy: dto.enteredBy?.trim()
            }
          });
        }
      }

      const updatedAssessment = await tx.assessment.findUniqueOrThrow({
        where: { id: assessment.id },
        include: {
          period: true,
          classSubject: {
            include: {
              class: true,
              subject: true,
              teacher: true
            }
          },
          grades: {
            include: {
              student: true
            },
            orderBy: {
              student: {
                lastName: "asc"
              }
            }
          }
        }
      });

      return normalizeAssessment(updatedAssessment);
    });
  }

  async reportCard(establishmentId: string, periodId: string, classId: string) {
    const period = await this.prisma.period.findFirst({
      where: { id: periodId, establishmentId }
    });

    if (!period) {
      throw new Error("Periode introuvable.");
    }

    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, establishmentId },
      include: {
        level: true,
        mainTeacher: true,
        classSubjects: {
          include: { subject: true, teacher: true },
          orderBy: { subject: { name: "asc" } }
        }
      }
    });

    if (!schoolClass) {
      throw new Error("Classe introuvable.");
    }

    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId }
    });

    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: schoolClass.academicYearId }
    });

    // Tous les élèves inscrits dans la classe pour cette année
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        establishmentId,
        classId,
        academicYearId: schoolClass.academicYearId,
        status: "ACTIVE"
      },
      include: { student: true },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }]
    });

    // Toutes les évaluations de la classe sur cette période
    const assessments = await this.prisma.assessment.findMany({
      where: {
        establishmentId,
        periodId,
        classSubject: { classId }
      },
      include: {
        classSubject: { include: { subject: true } },
        grades: true
      }
    });

    // Par matière (classSubject), on regroupe les évaluations
    const subjectMap = new Map<
      string,
      {
        subjectId: string;
        subjectName: string;
        subjectGroup: string | null;
        coefficient: number;
        assessments: typeof assessments;
      }
    >();

    for (const assessment of assessments) {
      const cs = assessment.classSubject;
      const key = cs.id;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          subjectId: cs.subjectId,
          subjectName: cs.subject.name,
          subjectGroup: cs.subject.subjectGroup,
          coefficient: money(cs.coefficient),
          assessments: []
        });
      }
      subjectMap.get(key)!.assessments.push(assessment);
    }

    const subjects = Array.from(subjectMap.values()).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName)
    );

    // Pour chaque élève, calcul des moyennes
    const studentResults = enrollments.map((enrollment) => {
      const student = enrollment.student;
      const subjectAverages: Array<{
        subjectName: string;
        subjectGroup: string | null;
        coefficient: number;
        average: number | null;
        grades: Array<{ assessmentName: string; score: number; maxScore: number; weight: number }>;
      }> = [];

      let weightedSum = 0;
      let totalCoef = 0;

      for (const subject of subjects) {
        const subjectGrades: Array<{
          assessmentName: string;
          score: number;
          maxScore: number;
          weight: number;
        }> = [];
        let numerator = 0;
        let denominator = 0;

        for (const assessment of subject.assessments) {
          const grade = assessment.grades.find((g) => g.studentId === student.id);
          const maxScore = money(assessment.maxScore);
          const weight = money(assessment.weight);
          subjectGrades.push({
            assessmentName: assessment.name,
            score: grade ? money(grade.score) : -1, // -1 = absent
            maxScore,
            weight
          });

          if (grade) {
            // Normalise sur 20
            const normalized = (money(grade.score) / maxScore) * 20;
            numerator += normalized * weight;
            denominator += weight;
          }
        }

        const average = denominator > 0 ? Math.round((numerator / denominator) * 100) / 100 : null;

        subjectAverages.push({
          subjectName: subject.subjectName,
          subjectGroup: subject.subjectGroup,
          coefficient: subject.coefficient,
          average,
          grades: subjectGrades
        });

        if (average !== null) {
          weightedSum += average * subject.coefficient;
          totalCoef += subject.coefficient;
        }
      }

      const generalAverage =
        totalCoef > 0 ? Math.round((weightedSum / totalCoef) * 100) / 100 : null;

      return {
        student: {
          id: student.id,
          matricule: student.matricule,
          firstName: student.firstName,
          lastName: student.lastName,
          gender: student.gender,
          birthDate: student.birthDate
        },
        subjectAverages,
        generalAverage
      };
    });

    // Calcul des rangs (les élèves sans moyenne générale sont classés en dernier)
    const ranked = [...studentResults].sort((a, b) => {
      if (a.generalAverage === null && b.generalAverage === null) return 0;
      if (a.generalAverage === null) return 1;
      if (b.generalAverage === null) return -1;
      return b.generalAverage - a.generalAverage;
    });

    const rankMap = new Map<string, number>();
    let currentRank = 1;
    for (let i = 0; i < ranked.length; i++) {
      if (ranked[i].generalAverage === null) {
        rankMap.set(ranked[i].student.id, ranked.length);
      } else {
        if (i > 0 && ranked[i].generalAverage !== ranked[i - 1].generalAverage) {
          currentRank = i + 1;
        }
        rankMap.set(ranked[i].student.id, currentRank);
      }
    }

    const validAverages = studentResults
      .filter((s) => s.generalAverage !== null)
      .map((s) => s.generalAverage!);

    const classAverage =
      validAverages.length > 0
        ? Math.round((validAverages.reduce((sum, a) => sum + a, 0) / validAverages.length) * 100) / 100
        : null;

    const bestAverage = validAverages.length > 0 ? Math.max(...validAverages) : null;
    const worstAverage = validAverages.length > 0 ? Math.min(...validAverages) : null;

    // Persister/Mettre à jour les bulletins dans la base de données
    await Promise.all(
      studentResults.map(async (s) => {
        const studentRank = rankMap.get(s.student.id) ?? null;
        const decision = s.generalAverage !== null && s.generalAverage >= 10 ? "ADMIS(E) EN CLASSE SUPÉRIEURE" : "AJOURNÉ(E)";

        const existing = await this.prisma.reportCard.findFirst({
          where: {
            establishmentId,
            studentId: s.student.id,
            periodId,
            classId
          }
        });

        if (existing) {
          await this.prisma.reportCard.update({
            where: { id: existing.id },
            data: {
              average: s.generalAverage,
              rank: studentRank,
              decision
            }
          });
        } else {
          await this.prisma.reportCard.create({
            data: {
              establishmentId,
              studentId: s.student.id,
              academicYearId: schoolClass.academicYearId,
              periodId,
              classId,
              average: s.generalAverage,
              rank: studentRank,
              decision
            }
          });
        }
      })
    );

    return {
      establishment,
      academicYear,
      period,
      schoolClass: {
        id: schoolClass.id,
        name: schoolClass.name,
        level: schoolClass.level,
        mainTeacher: schoolClass.mainTeacher
      },
      totalStudents: enrollments.length,
      classAverage,
      bestAverage,
      worstAverage,
      students: studentResults.map((s) => ({
        ...s,
        rank: rankMap.get(s.student.id) ?? null
      }))
    };
  }
}
