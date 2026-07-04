import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateGradingTemplateDto {
  periodType: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  slots: {
    label: string;
    code: string;
    weight: number;
    maxScore: number;
    orderIndex: number;
    mandatory?: boolean;
  }[];
}

export interface UpdateGradingTemplateDto {
  name?: string;
  description?: string;
  isDefault?: boolean;
  slots?: {
    label: string;
    code: string;
    weight: number;
    maxScore: number;
    orderIndex: number;
    mandatory?: boolean;
  }[];
}

@Injectable()
export class GradingTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste tous les modèles de barème d'un établissement
   */
  async findAll(establishmentId: string) {
    return this.prisma.periodGradingTemplate.findMany({
      where: { establishmentId },
      include: {
        slots: { orderBy: { orderIndex: "asc" } },
        periods: { select: { id: true, name: true, type: true } }
      },
      orderBy: [{ periodType: "asc" }, { isDefault: "desc" }, { name: "asc" }]
    });
  }

  /**
   * Récupère un modèle par ID
   */
  async findOne(establishmentId: string, id: string) {
    const template = await this.prisma.periodGradingTemplate.findFirst({
      where: { id, establishmentId },
      include: {
        slots: { orderBy: { orderIndex: "asc" } },
        periods: { select: { id: true, name: true, type: true } }
      }
    });
    if (!template) throw new NotFoundException("Modèle de barème introuvable.");
    return template;
  }

  /**
   * Crée un nouveau modèle de barème avec ses slots
   */
  async create(establishmentId: string, dto: CreateGradingTemplateDto) {
    // Si ce modèle est marqué par défaut, retirer l'ancien défaut du même type
    if (dto.isDefault) {
      await this.prisma.periodGradingTemplate.updateMany({
        where: { establishmentId, periodType: dto.periodType, isDefault: true },
        data: { isDefault: false }
      });
    }

    return this.prisma.periodGradingTemplate.create({
      data: {
        establishmentId,
        periodType: dto.periodType,
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault ?? false,
        slots: {
          create: dto.slots.map((slot, idx) => ({
            label: slot.label,
            code: slot.code,
            weight: slot.weight,
            maxScore: slot.maxScore,
            orderIndex: slot.orderIndex ?? idx,
            mandatory: slot.mandatory ?? true
          }))
        }
      },
      include: { slots: { orderBy: { orderIndex: "asc" } } }
    });
  }

  /**
   * Modifie un modèle (remplace complètement les slots si fournis)
   */
  async update(establishmentId: string, id: string, dto: UpdateGradingTemplateDto) {
    const existing = await this.prisma.periodGradingTemplate.findFirst({
      where: { id, establishmentId }
    });
    if (!existing) throw new NotFoundException("Modèle de barème introuvable.");

    // Si on passe isDefault à true, retirer l'ancien par défaut du même type
    if (dto.isDefault === true) {
      await this.prisma.periodGradingTemplate.updateMany({
        where: {
          establishmentId,
          periodType: existing.periodType,
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }

    // Si on remplace les slots, supprimer les anciens d'abord
    if (dto.slots !== undefined) {
      await this.prisma.periodGradingSlot.deleteMany({ where: { templateId: id } });
    }

    return this.prisma.periodGradingTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.slots !== undefined && {
          slots: {
            create: dto.slots.map((slot, idx) => ({
              label: slot.label,
              code: slot.code,
              weight: slot.weight,
              maxScore: slot.maxScore,
              orderIndex: slot.orderIndex ?? idx,
              mandatory: slot.mandatory ?? true
            }))
          }
        })
      },
      include: { slots: { orderBy: { orderIndex: "asc" } } }
    });
  }

  /**
   * Supprime un modèle (cascade supprime les slots via Prisma schema)
   */
  async remove(establishmentId: string, id: string) {
    const existing = await this.prisma.periodGradingTemplate.findFirst({
      where: { id, establishmentId },
      include: { periods: { select: { id: true } } }
    });
    if (!existing) throw new NotFoundException("Modèle de barème introuvable.");
    if (existing.periods.length > 0) {
      throw new ConflictException(
        `Ce modèle est utilisé par ${existing.periods.length} période(s). Veuillez d'abord le dissocier.`
      );
    }

    await this.prisma.periodGradingTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Applique un modèle à une période : crée automatiquement les évaluations
   * pour chaque matière de la classe associée à cette période.
   * @returns Nombre d'évaluations créées
   */
  async applyToPeriod(
    establishmentId: string,
    templateId: string,
    periodId: string
  ) {
    const template = await this.prisma.periodGradingTemplate.findFirst({
      where: { id: templateId, establishmentId },
      include: { slots: { orderBy: { orderIndex: "asc" } } }
    });
    if (!template) throw new NotFoundException("Modèle de barème introuvable.");

    const period = await this.prisma.period.findFirst({
      where: { id: periodId, establishmentId },
      include: {
        academicYear: {
          include: {
            classes: {
              include: { classSubjects: true }
            }
          }
        }
      }
    });
    if (!period) throw new NotFoundException("Période introuvable.");

    // Associer le modèle à la période
    await this.prisma.period.update({
      where: { id: periodId },
      data: { gradingTemplateId: templateId }
    });

    // Créer les évaluations pour chaque ClassSubject × chaque slot du modèle
    let created = 0;
    const allClassSubjects = period.academicYear.classes.flatMap(
      (cls) => cls.classSubjects
    );

    for (const cs of allClassSubjects) {
      for (const slot of template.slots) {
        // Vérifier si une évaluation de ce slot existe déjà
        const exists = await this.prisma.assessment.findFirst({
          where: {
            periodId,
            classSubjectId: cs.id,
            name: slot.label
          }
        });
        if (!exists) {
          await this.prisma.assessment.create({
            data: {
              establishmentId,
              academicYearId: period.academicYearId,
              periodId,
              classSubjectId: cs.id,
              name: slot.label,
              maxScore: slot.maxScore,
              weight: slot.weight
            }
          });
          created++;
        }
      }
    }

    return { created, templateId, periodId };
  }
}
