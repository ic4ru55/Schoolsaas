import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StartImportDto } from "./dto/start-import.dto";
import { Gender } from "@prisma/client";

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getImportJobs(establishmentId: string) {
    return this.prisma.importJob.findMany({
      where: { establishmentId },
      include: { errors: true },
      orderBy: { startedAt: "desc" }
    });
  }

  async startStudentImport(establishmentId: string, dto: StartImportDto) {
    const { mapping, rows, classId, startedBy } = dto;

    if (!rows || rows.length === 0) {
      throw new BadRequestException("Aucune donnée à importer.");
    }

    // Récupérer l'année académique active de l'établissement
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      include: {
        academicYears: {
          where: { status: "ACTIVE" }
        }
      }
    });

    if (!establishment) {
      throw new NotFoundException("Établissement introuvable.");
    }

    const activeYear = establishment.academicYears[0];
    if (!activeYear) {
      throw new BadRequestException("Aucune année scolaire active configurée.");
    }

    // Créer le Job d'importation
    const job = await this.prisma.importJob.create({
      data: {
        establishmentId,
        type: "STUDENT",
        fileName: "Import direct",
        status: "running",
        mapping: mapping as any,
        totalRows: rows.length,
        startedBy: startedBy || "Administration"
      }
    });

    const errorsToCreate: any[] = [];
    const validRowsToImport: any[] = [];

    // Récupérer les classes de l'année en cours pour validation
    const classes = await this.prisma.schoolClass.findMany({
      where: { establishmentId, academicYearId: activeYear.id }
    });

    // Pour la détection de doublons (nom + prénom + date naissance ou matricule)
    const existingStudents = await this.prisma.student.findMany({
      where: { establishmentId },
      select: { matricule: true, firstName: true, lastName: true }
    });

    const existingMatricules = new Set(existingStudents.map(s => s.matricule.toLowerCase()));
    const existingNames = new Set(existingStudents.map(s => `${s.lastName.toLowerCase()}|${s.firstName.toLowerCase()}`));

    // Validation ligne par ligne
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 1;

      // Extraire les champs en fonction du mapping
      const rawLastName = mapping["lastName"] ? String(row[mapping["lastName"]] || "").trim() : "";
      const rawFirstName = mapping["firstName"] ? String(row[mapping["firstName"]] || "").trim() : "";
      const rawGender = mapping["gender"] ? String(row[mapping["gender"]] || "").trim().toUpperCase() : "";
      const rawBirthDate = mapping["birthDate"] ? String(row[mapping["birthDate"]] || "").trim() : "";
      const rawMatricule = mapping["matricule"] ? String(row[mapping["matricule"]] || "").trim() : "";
      const rawClassName = mapping["className"] ? String(row[mapping["className"]] || "").trim() : "";

      // Validations critiques
      if (!rawLastName) {
        errorsToCreate.push({
          establishmentId,
          importJobId: job.id,
          rowNumber: rowNum,
          field: "Nom",
          message: "Le nom de famille est obligatoire.",
          rawValue: JSON.stringify(row)
        });
        continue;
      }

      if (!rawFirstName) {
        errorsToCreate.push({
          establishmentId,
          importJobId: job.id,
          rowNumber: rowNum,
          field: "Prénom",
          message: "Le prénom est obligatoire.",
          rawValue: JSON.stringify(row)
        });
        continue;
      }

      // Valider et normaliser le genre
      let gender: Gender | null = null;
      if (rawGender) {
        if (["M", "MALE", "MASCULIN", "GARCON", "GARÇON"].includes(rawGender)) {
          gender = Gender.MALE;
        } else if (["F", "FEMALE", "FEMININ", "FÉMININ", "FILLE"].includes(rawGender)) {
          gender = Gender.FEMALE;
        } else {
          errorsToCreate.push({
            establishmentId,
            importJobId: job.id,
            rowNumber: rowNum,
            field: "Genre",
            message: `Genre invalide : '${rawGender}'. Utiliser M ou F.`,
            rawValue: rawGender
          });
          continue;
        }
      }

      // Valider la date de naissance
      let birthDate: Date | null = null;
      if (rawBirthDate) {
        const parsedDate = new Date(rawBirthDate);
        if (isNaN(parsedDate.getTime())) {
          errorsToCreate.push({
            establishmentId,
            importJobId: job.id,
            rowNumber: rowNum,
            field: "Date de naissance",
            message: `Date invalide : '${rawBirthDate}'. Format attendu AAAA-MM-JJ.`,
            rawValue: rawBirthDate
          });
          continue;
        }
        birthDate = parsedDate;
      }

      // Déterminer la classe de destination
      let targetClassId = classId;
      if (!targetClassId && rawClassName) {
        const matchedClass = classes.find(c => c.name.toLowerCase() === rawClassName.toLowerCase());
        if (matchedClass) {
          targetClassId = matchedClass.id;
        } else {
          errorsToCreate.push({
            establishmentId,
            importJobId: job.id,
            rowNumber: rowNum,
            field: "Classe",
            message: `Classe '${rawClassName}' introuvable dans l'année active.`,
            rawValue: rawClassName
          });
          continue;
        }
      }

      if (!targetClassId) {
        errorsToCreate.push({
          establishmentId,
          importJobId: job.id,
          rowNumber: rowNum,
          field: "Classe",
          message: "Aucune classe spécifiée ou trouvée pour cet élève.",
          rawValue: rawClassName || ""
        });
        continue;
      }

      // Doublon sur le matricule si fourni
      if (rawMatricule && existingMatricules.has(rawMatricule.toLowerCase())) {
        errorsToCreate.push({
          establishmentId,
          importJobId: job.id,
          rowNumber: rowNum,
          field: "Matricule",
          message: `Le matricule '${rawMatricule}' existe déjà.`,
          rawValue: rawMatricule
        });
        continue;
      }

      // Doublon sur Nom & Prénom
      const nameKey = `${rawLastName.toLowerCase()}|${rawFirstName.toLowerCase()}`;
      if (existingNames.has(nameKey)) {
        errorsToCreate.push({
          establishmentId,
          importJobId: job.id,
          rowNumber: rowNum,
          field: "Nom & Prénom",
          message: `Un élève nommé '${rawLastName} ${rawFirstName}' existe déjà dans cet établissement.`,
          rawValue: `${rawLastName} ${rawFirstName}`
        });
        continue;
      }

      validRowsToImport.push({
        lastName: rawLastName,
        firstName: rawFirstName,
        gender,
        birthDate,
        matricule: rawMatricule || null,
        classId: targetClassId
      });
    }

    // Effectuer les insertions de manière transactionnelle
    if (validRowsToImport.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        let currentNextNum = establishment.studentMatriculeNextNumber;

        for (const data of validRowsToImport) {
          let finalMatricule = data.matricule;

          if (!finalMatricule) {
            // Générer un matricule unique
            const yearSuffix = new Date(activeYear.startsAt).getFullYear().toString().slice(-2);
            const prefix = establishment.studentMatriculePrefix;
            const seqStr = String(currentNextNum).padStart(establishment.studentMatriculePadding, "0");
            
            // Format : PREFIX-YEAR-SEQ
            finalMatricule = establishment.studentMatriculeFormat
              .replace("{PREFIX}", prefix)
              .replace("{YEAR}", yearSuffix)
              .replace("{SEQ}", seqStr);

            currentNextNum++;
          }

          // Création de l'élève
          const student = await tx.student.create({
            data: {
              establishmentId,
              matricule: finalMatricule,
              firstName: data.firstName,
              lastName: data.lastName,
              gender: data.gender,
              birthDate: data.birthDate,
              status: "ACTIVE"
            }
          });

          // Inscription de l'élève dans la classe
          await tx.enrollment.create({
            data: {
              establishmentId,
              studentId: student.id,
              academicYearId: activeYear.id,
              classId: data.classId,
              enrollmentType: "NEW",
              status: "ACTIVE"
            }
          });
        }

        // Mettre à jour le prochain numéro de matricule
        if (currentNextNum !== establishment.studentMatriculeNextNumber) {
          await tx.establishment.update({
            where: { id: establishmentId },
            data: { studentMatriculeNextNumber: currentNextNum }
          });
        }
      });
    }

    // Sauvegarder les erreurs s'il y en a
    if (errorsToCreate.length > 0) {
      await this.prisma.importError.createMany({
        data: errorsToCreate
      });
    }

    const finalStatus = errorsToCreate.length === rows.length 
      ? "failed" 
      : errorsToCreate.length > 0 
        ? "completed_with_errors" 
        : "success";

    const updatedJob = await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        validRows: validRowsToImport.length,
        errorRows: errorsToCreate.length,
        completedAt: new Date()
      },
      include: { errors: true }
    });

    return updatedJob;
  }
}
