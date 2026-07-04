import { randomUUID } from "crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AssignFeeItemDto } from "./dto/assign-fee-item.dto";
import { CollectPaymentDto } from "./dto/collect-payment.dto";
import { CreateFeeItemDto } from "./dto/create-fee-item.dto";
import { UpdateFeeItemDto } from "./dto/update-fee-item.dto";

function money(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function netDue(assignment: {
  amountDue: unknown;
  discountAmount: unknown;
  scholarshipAmount: unknown;
}) {
  return Math.max(
    0,
    money(assignment.amountDue) -
      money(assignment.discountAmount) -
      money(assignment.scholarshipAmount)
  );
}

function paidAmount(assignment: { allocations?: Array<{ amount: unknown }> }) {
  return assignment.allocations?.reduce((total, allocation) => total + money(allocation.amount), 0) ?? 0;
}

function balanceAmount(assignment: {
  amountDue: unknown;
  discountAmount: unknown;
  scholarshipAmount: unknown;
  allocations?: Array<{ amount: unknown }>;
}) {
  return Math.max(0, netDue(assignment) - paidAmount(assignment));
}

function receiptYear(academicYearName: string) {
  return academicYearName.match(/\d{4}/)?.[0] ?? new Date().getFullYear().toString();
}

function receiptNumber(academicYearName: string, serial: number) {
  const suffix = randomUUID().slice(0, 4).toUpperCase();
  return `REC-${receiptYear(academicYearName)}-${String(serial).padStart(5, "0")}-${suffix}`;
}

function normalizeFeeItem(feeItem: any) {
  return {
    ...feeItem,
    amount: money(feeItem.amount),
    assignmentsCount: feeItem._count?.assignments ?? feeItem.assignmentsCount ?? 0,
    paidAmount: feeItem.paidAmount ?? 0
  };
}

function normalizePayment(payment: any) {
  return {
    ...payment,
    amount: money(payment.amount),
    allocations:
      payment.allocations?.map((allocation: any) => ({
        ...allocation,
        amount: money(allocation.amount),
        studentFeeAssignment: allocation.studentFeeAssignment
          ? {
              ...allocation.studentFeeAssignment,
              amountDue: money(allocation.studentFeeAssignment.amountDue),
              discountAmount: money(allocation.studentFeeAssignment.discountAmount),
              scholarshipAmount: money(allocation.studentFeeAssignment.scholarshipAmount),
              feeItem: allocation.studentFeeAssignment.feeItem
                ? normalizeFeeItem(allocation.studentFeeAssignment.feeItem)
                : undefined
            }
          : undefined
      })) ?? []
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService
  ) {}


  private async resolveContext(establishmentId: string, academicYearId?: string) {
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: {
        id: true,
        name: true,
        legalName: true,
        city: true,
        country: true,
        phone: true,
        email: true,
        logoUrl: true,
        stampUrl: true,
        directorSignatureUrl: true,
        cashierSignatureUrl: true,
        motto: true,
        currency: true,
        activeAcademicYearId: true
      }
    });

    if (!establishment) {
      throw new NotFoundException("Etablissement introuvable.");
    }

    const resolvedAcademicYearId = academicYearId || establishment.activeAcademicYearId;
    if (!resolvedAcademicYearId) {
      throw new BadRequestException("Aucune annee scolaire active pour les paiements.");
    }

    const academicYear = await this.prisma.academicYear.findFirst({
      where: {
        id: resolvedAcademicYearId,
        establishmentId
      }
    });

    if (!academicYear) {
      throw new BadRequestException("L'annee scolaire indiquee est introuvable.");
    }

    return { establishment, academicYear };
  }

  async overview(establishmentId: string, academicYearId?: string) {
    const { establishment, academicYear } = await this.resolveContext(establishmentId, academicYearId);

    const [feeItems, students, recentPayments] = await Promise.all([
      this.prisma.feeItem.findMany({
        where: {
          establishmentId,
          academicYearId: academicYear.id
        },
        include: {
          level: true,
          class: true,
          assignments: {
            include: {
              allocations: {
                where: {
                  payment: {
                    cancelledAt: null
                  }
                }
              }
            }
          },
          _count: {
            select: {
              assignments: true
            }
          }
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }]
      }),
      this.prisma.student.findMany({
        where: {
          establishmentId,
          status: "ACTIVE",
          enrollments: {
            some: {
              academicYearId: academicYear.id,
              status: "ACTIVE"
            }
          }
        },
        include: {
          enrollments: {
            where: {
              academicYearId: academicYear.id
            },
            include: {
              class: {
                include: {
                  level: true
                }
              }
            },
            orderBy: {
              enrolledAt: "desc"
            }
          },
          guardians: {
            include: {
              guardian: true
            },
            orderBy: {
              isPrimary: "desc"
            }
          },
          feeAssignments: {
            where: {
              academicYearId: academicYear.id
            },
            include: {
              feeItem: true,
              allocations: {
                where: {
                  payment: {
                    cancelledAt: null
                  }
                }
              }
            }
          }
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
      }),
      this.prisma.payment.findMany({
        where: {
          establishmentId,
          academicYearId: academicYear.id,
          cancelledAt: null
        },
        include: {
          student: true,
          academicYear: true,
          receipt: true,
          allocations: {
            include: {
              studentFeeAssignment: {
                include: {
                  feeItem: true
                }
              }
            }
          }
        },
        orderBy: {
          paidAt: "desc"
        },
        take: 12
      })
    ]);

    const studentSummaries = students.map((student) => {
      const assignments = student.feeAssignments.map((assignment) => {
        const due = netDue(assignment);
        const paid = paidAmount(assignment);
        return {
          id: assignment.id,
          feeItemId: assignment.feeItemId,
          feeName: assignment.feeItem.name,
          amountDue: due,
          paid,
          balance: Math.max(0, due - paid),
          dueDate: assignment.feeItem.dueDate
        };
      });
      const totalDue = assignments.reduce((total, assignment) => total + assignment.amountDue, 0);
      const paid = assignments.reduce((total, assignment) => total + assignment.paid, 0);
      const balance = Math.max(0, totalDue - paid);

      return {
        id: student.id,
        matricule: student.matricule,
        firstName: student.firstName,
        lastName: student.lastName,
        status: student.status,
        className: student.enrollments[0]?.class?.name ?? null,
        classId: student.enrollments[0]?.classId ?? null,
        guardianPhone: student.guardians[0]?.guardian.phone ?? null,
        totalDue,
        paid,
        balance,
        assignments
      };
    });

    const totalExpected = studentSummaries.reduce((total, student) => total + student.totalDue, 0);
    const totalPaid = studentSummaries.reduce((total, student) => total + student.paid, 0);
    const today = new Date();
    const soon = new Date(today);
    soon.setDate(today.getDate() + 7);
    const studentsWithBalance = studentSummaries.filter((student) => student.balance > 0);
    const studentsWithoutFees = studentSummaries.filter((student) => !student.assignments.length);
    const overdueAssignments = studentSummaries.flatMap((student) =>
      student.assignments
        .filter(
          (assignment) =>
            assignment.balance > 0 &&
            assignment.dueDate &&
            new Date(assignment.dueDate).getTime() < today.getTime()
        )
        .map((assignment) => ({ student, assignment }))
    );
    const upcomingAssignments = studentSummaries.flatMap((student) =>
      student.assignments
        .filter((assignment) => {
          if (!assignment.dueDate || assignment.balance <= 0) {
            return false;
          }
          const dueDate = new Date(assignment.dueDate);
          return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= soon.getTime();
        })
        .map((assignment) => ({ student, assignment }))
    );
    const financeAlerts = [
      ...(studentsWithBalance.length
        ? [
            `${studentsWithBalance.length} eleve(s) ont un reste a payer pour ${academicYear.name}.`
          ]
        : []),
      ...(overdueAssignments.length
        ? [`${overdueAssignments.length} tranche(s) en retard de paiement.`]
        : []),
      ...(upcomingAssignments.length
        ? [`${upcomingAssignments.length} echeance(s) arrivent dans les 7 prochains jours.`]
        : []),
      ...(studentsWithoutFees.length
        ? [`${studentsWithoutFees.length} eleve(s) actifs n'ont aucun frais affecte.`]
        : [])
    ];

    return {
      establishment,
      academicYear,
      feeItems: feeItems.map((feeItem) =>
        normalizeFeeItem({
          ...feeItem,
          paidAmount: feeItem.assignments.reduce(
            (total, assignment) => total + paidAmount(assignment),
            0
          )
        })
      ),
      students: studentSummaries,
      recentPayments: recentPayments.map(normalizePayment),
      totals: {
        expected: totalExpected,
        paid: totalPaid,
        balance: Math.max(0, totalExpected - totalPaid)
      },
      alerts: financeAlerts
    };
  }

  async createFeeItem(establishmentId: string, dto: CreateFeeItemDto) {
    await this.resolveContext(establishmentId, dto.academicYearId);

    if (dto.levelId) {
      const level = await this.prisma.level.findFirst({
        where: {
          id: dto.levelId,
          establishmentId
        }
      });

      if (!level) {
        throw new BadRequestException("Le niveau indique est introuvable.");
      }
    }

    if (dto.classId) {
      const schoolClass = await this.prisma.schoolClass.findFirst({
        where: {
          id: dto.classId,
          establishmentId,
          academicYearId: dto.academicYearId
        }
      });

      if (!schoolClass) {
        throw new BadRequestException("La classe indiquee est introuvable pour cette annee.");
      }
    }

    const feeItem = await this.prisma.feeItem.create({
      data: {
        establishmentId,
        academicYearId: dto.academicYearId,
        levelId: dto.levelId,
        classId: dto.classId,
        name: dto.name.trim(),
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        required: dto.required ?? true
      },
      include: {
        level: true,
        class: true,
        _count: {
          select: {
            assignments: true
          }
        }
      }
    });

    return normalizeFeeItem(feeItem);
  }

  async assignFeeItem(establishmentId: string, feeItemId: string, dto: AssignFeeItemDto) {
    const feeItem = await this.prisma.feeItem.findFirst({
      where: {
        id: feeItemId,
        establishmentId
      }
    });

    if (!feeItem) {
      throw new NotFoundException("Frais introuvable.");
    }

    const studentWhere: any = {
      establishmentId,
      status: "ACTIVE",
      enrollments: {
        some: {
          academicYearId: feeItem.academicYearId,
          status: "ACTIVE"
        }
      }
    };

    if (dto.target === "CLASS") {
      const classId = dto.classId || feeItem.classId;
      if (!classId) {
        throw new BadRequestException("Choisir une classe pour cette affectation.");
      }

      const schoolClass = await this.prisma.schoolClass.findFirst({
        where: {
          id: classId,
          establishmentId,
          academicYearId: feeItem.academicYearId
        }
      });

      if (!schoolClass) {
        throw new BadRequestException("La classe indiquee est introuvable.");
      }

      studentWhere.enrollments.some.classId = classId;
    }

    if (dto.target === "STUDENT") {
      if (!dto.studentId) {
        throw new BadRequestException("Choisir un eleve pour cette affectation.");
      }

      studentWhere.id = dto.studentId;
    }

    const students = await this.prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true
      }
    });

    if (!students.length) {
      throw new BadRequestException("Aucun eleve actif trouve pour cette affectation.");
    }

    const result = await this.prisma.studentFeeAssignment.createMany({
      data: students.map((student) => ({
        establishmentId,
        studentId: student.id,
        academicYearId: feeItem.academicYearId,
        feeItemId: feeItem.id,
        amountDue: feeItem.amount
      })),
      skipDuplicates: true
    });

    return {
      assigned: result.count,
      skipped: students.length - result.count
    };
  }

  async updateFeeItem(establishmentId: string, feeItemId: string, dto: UpdateFeeItemDto) {
    const feeItem = await this.prisma.feeItem.findFirst({
      where: {
        id: feeItemId,
        establishmentId
      },
      include: {
        assignments: {
          include: {
            allocations: {
              where: {
                payment: {
                  cancelledAt: null
                }
              }
            }
          }
        }
      }
    });

    if (!feeItem) {
      throw new NotFoundException("Frais introuvable.");
    }

    const paid = feeItem.assignments.reduce(
      (total, assignment) => total + paidAmount(assignment),
      0
    );
    if (paid > 0 && dto.amount !== undefined && dto.amount < paid) {
      throw new BadRequestException(
        `Montant refuse : ${paid} est deja encaisse sur ce frais.`
      );
    }

    if (dto.classId) {
      const schoolClass = await this.prisma.schoolClass.findFirst({
        where: {
          id: dto.classId,
          establishmentId,
          academicYearId: feeItem.academicYearId
        }
      });

      if (!schoolClass) {
        throw new BadRequestException("La classe indiquee est introuvable pour cette annee.");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.feeItem.update({
        where: {
          id: feeItem.id
        },
        data: {
          name: dto.name?.trim(),
          amount: dto.amount,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          classId: dto.classId,
          required: dto.required
        },
        include: {
          level: true,
          class: true,
          _count: {
            select: {
              assignments: true
            }
          }
        }
      });

      if (dto.amount !== undefined) {
        const assignmentIds = feeItem.assignments
          .filter((assignment) => paidAmount(assignment) === 0)
          .map((assignment) => assignment.id);

        if (assignmentIds.length) {
          await tx.studentFeeAssignment.updateMany({
            where: {
              id: {
                in: assignmentIds
              }
            },
            data: {
              amountDue: dto.amount
            }
          });
        }
      }

      return normalizeFeeItem({ ...updated, paidAmount: paid });
    });
  }

  async deleteFeeItem(establishmentId: string, feeItemId: string) {
    const feeItem = await this.prisma.feeItem.findFirst({
      where: {
        id: feeItemId,
        establishmentId
      },
      include: {
        assignments: {
          include: {
            allocations: {
              where: {
                payment: {
                  cancelledAt: null
                }
              }
            }
          }
        }
      }
    });

    if (!feeItem) {
      throw new NotFoundException("Frais introuvable.");
    }

    const paid = feeItem.assignments.reduce(
      (total, assignment) => total + paidAmount(assignment),
      0
    );

    if (paid > 0) {
      throw new BadRequestException(
        "Suppression refusee : ce frais a deja des paiements encaisses."
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.studentFeeAssignment.deleteMany({
        where: {
          feeItemId: feeItem.id
        }
      });
      await tx.feeItem.delete({
        where: {
          id: feeItem.id
        }
      });
    });

    return { id: feeItem.id, deleted: true };
  }

  async collect(establishmentId: string, dto: CollectPaymentDto) {
    const { establishment, academicYear } = await this.resolveContext(
      establishmentId,
      dto.academicYearId
    );

    const student = await this.prisma.student.findFirst({
      where: {
        id: dto.studentId,
        establishmentId,
        status: "ACTIVE",
        enrollments: {
          some: {
            academicYearId: academicYear.id,
            status: "ACTIVE"
          }
        }
      }
    });

    if (!student) {
      throw new BadRequestException("Eleve introuvable ou non inscrit dans l'annee active.");
    }

    const collectedAmount = dto.amount;

    const result = await this.prisma.$transaction(async (tx) => {
      const assignments = await tx.studentFeeAssignment.findMany({
        where: {
          establishmentId,
          studentId: student.id,
          academicYearId: academicYear.id
        },
        include: {
          feeItem: true,
          allocations: {
            where: {
              payment: {
                cancelledAt: null
              }
            }
          }
        }
      });

      if (!assignments.length) {
        throw new BadRequestException("Aucun frais n'est affecte a cet eleve.");
      }

      const orderedAssignments = [...assignments].sort((left, right) => {
        const leftDueDate = left.feeItem.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightDueDate = right.feeItem.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftDueDate - rightDueDate || left.createdAt.getTime() - right.createdAt.getTime();
      });
      const totalBalance = orderedAssignments.reduce(
        (total, assignment) => total + balanceAmount(assignment),
        0
      );

      if (totalBalance <= 0) {
        throw new BadRequestException("Cet eleve n'a aucun reste a payer.");
      }

      if (collectedAmount > totalBalance) {
        throw new BadRequestException(
          `Montant refuse : le reste a payer est de ${totalBalance} ${establishment.currency}.`
        );
      }

      let remaining = collectedAmount;
      const allocations: Array<{ studentFeeAssignmentId: string; amount: number }> = [];
      for (const assignment of orderedAssignments) {
        if (remaining <= 0) {
          break;
        }

        const balance = balanceAmount(assignment);
        if (balance <= 0) {
          continue;
        }

        const amount = Math.min(balance, remaining);
        allocations.push({
          studentFeeAssignmentId: assignment.id,
          amount
        });
        remaining -= amount;
      }

      const paymentCount = await tx.payment.count({
        where: {
          establishmentId,
          academicYearId: academicYear.id
        }
      });
      const payment = await tx.payment.create({
        data: {
          establishmentId,
          studentId: student.id,
          academicYearId: academicYear.id,
          amount: collectedAmount,
          method: dto.method,
          reference: dto.reference?.trim(),
          receivedBy: dto.receivedBy?.trim(),
          receiptNumber: receiptNumber(academicYear.name, paymentCount + 1)
        }
      });

      await tx.paymentAllocation.createMany({
        data: allocations.map((allocation) => ({
          establishmentId,
          paymentId: payment.id,
          studentFeeAssignmentId: allocation.studentFeeAssignmentId,
          amount: allocation.amount
        }))
      });

      await tx.receipt.create({
        data: {
          establishmentId,
          paymentId: payment.id,
          receiptNumber: payment.receiptNumber
        }
      });

      const createdPayment = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: {
          student: true,
          academicYear: true,
          receipt: true,
          allocations: {
            include: {
              studentFeeAssignment: {
                include: {
                  feeItem: true
                }
              }
            }
          }
        }
      });

      return normalizePayment(createdPayment);
    });

    // Audit log — encaissement de paiement
    await this.auditLogs.log({
      establishmentId,
      userId: null,
      action: "PAYMENT_COLLECT",
      entityType: "Payment",
      entityId: result.id,
      newValues: {
        amount: result.amount,
        method: result.method,
        studentId: dto.studentId,
        receiptNumber: result.receiptNumber
      }
    });

    return result;
  }
}
