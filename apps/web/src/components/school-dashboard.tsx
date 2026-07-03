"use client";

import {
  AlertTriangle,
  Banknote,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  Loader2,
  PlayCircle,
  Plus,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  Printer,
  Trash2,
  Users
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AcademicYear,
  activateAcademicYear,
  assignSubjectToClass,
  assignFeeItem,
  collectPayment,
  createClass,
  createAcademicYear,
  createEstablishment,
  createFeeItem,
  createLevel,
  createStudent,
  createSubject,
  deleteStudentDocument,
  deleteFeeItem,
  Establishment,
  getClasses,
  getDashboard,
  getEstablishments,
  getLevels,
  getPaymentsOverview,
  getStudentDocuments,
  getStudents,
  getSubjects,
  Level,
  SchoolClass,
  Student,
  StudentDocument,
  studentDocumentFileUrl,
  Subject,
  PaymentRecord,
  PaymentsOverview,
  uploadStudentDocument,
  updateFeeItem,
  updateEstablishment
} from "../lib/api";

type AppView =
  | "dashboard"
  | "settings"
  | "structure"
  | "students"
  | "documents"
  | "payments"
  | "grades"
  | "imports"
  | "backups"
  | "roles";

type StructureTab = "levels" | "subjects" | "classes" | "coefficients";
type PaymentTab = "fees" | "collect" | "receipts";

type GuardianForm = {
  relationship: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  profession: string;
  address: string;
};

function emptyGuardianForm(relationship = "Pere"): GuardianForm {
  return {
    relationship,
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    profession: "",
    address: ""
  };
}

function emptyClassForm() {
  return {
    name: "",
    code: "",
    capacity: "",
    levelId: "",
    tuitionEnabled: false,
    tuitionTranches: [
      { name: "Scolarite - tranche 1", amount: "", dueDate: "" },
      { name: "Scolarite - tranche 2", amount: "", dueDate: "" }
    ]
  };
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

const structureTabs = [
  { label: "Niveaux", value: "levels" },
  { label: "Matieres", value: "subjects" },
  { label: "Classes", value: "classes" },
  { label: "Coefficients", value: "coefficients" }
] as const;

const paymentTabs = [
  { label: "Frais", value: "fees" },
  { label: "Encaissement", value: "collect" },
  { label: "Recus", value: "receipts" }
] as const;

const navGroups = [
  {
    label: "Pilotage",
    items: [
      { label: "Tableau de bord", icon: LayoutDashboard, view: "dashboard" },
      { label: "Parametrage", icon: Settings, view: "settings" }
    ]
  },
  {
    label: "Scolarite",
    items: [
      { label: "Eleves", icon: GraduationCap, view: "students" },
      { label: "Documents", icon: FileText, view: "documents" },
      { label: "Classes", icon: LibraryBig, view: "structure", submenu: structureTabs }
    ]
  },
  {
    label: "Gestion",
    items: [
      { label: "Paiements", icon: Banknote, view: "payments", submenu: paymentTabs },
      { label: "Notes", icon: BookOpen, view: "grades" },
      { label: "Imports", icon: FileSpreadsheet, view: "imports" }
    ]
  },
  {
    label: "Administration",
    items: [
      { label: "Sauvegardes", icon: CloudUpload, view: "backups" },
      { label: "Roles", icon: ShieldCheck, view: "roles" }
    ]
  }
] as const;

const documentTypes = [
  { label: "Acte de naissance", value: "BIRTH_CERTIFICATE" },
  { label: "Photo eleve", value: "PHOTO" },
  { label: "Ancien bulletin", value: "PREVIOUS_REPORT" },
  { label: "Certificat", value: "CERTIFICATE" },
  { label: "Piece du parent", value: "GUARDIAN_ID" },
  { label: "Autre document", value: "OTHER" }
];

const moduleCards = [
  ["Scolarite", "Eleves, parents, classes"],
  ["Finance", "Tranches, recus, restes"],
  ["Pedagogie", "Notes, moyennes, bulletins"],
  ["Documents", "PDF imprimables"],
  ["Imports", "Excel et CSV"],
  ["Securite", "Roles et journal"]
];

const defaultMetrics = {
  students: 0,
  classes: 0,
  teachers: 0,
  payments: 0
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cleanPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function isValidPhone(value: string) {
  return value === "" || /^\d{8}$/.test(value);
}

function isValidEmail(value: string) {
  return value === "" || emailPattern.test(value);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function documentTypeLabel(value: string) {
  return documentTypes.find((item) => item.value === value)?.label ?? value;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} Ko`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatMoney(amount: number, currency = "XOF") {
  return `${Math.round(amount).toLocaleString("fr-FR")} ${currency}`;
}

function paymentMethodLabel(value: string) {
  const labels: Record<string, string> = {
    CASH: "Especes",
    MOBILE_MONEY: "Mobile money",
    BANK_TRANSFER: "Virement",
    CHECK: "Cheque",
    OTHER: "Autre"
  };
  return labels[value] ?? value;
}

function documentDisplayName(document: StudentDocument) {
  return document.label || document.originalName;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}

function matriculeYear(value?: string | null) {
  return value?.match(/\d{4}/)?.[0] ?? new Date().getFullYear().toString();
}

function previewStudentMatricule(establishment: Establishment | null, activeYear: AcademicYear | null) {
  if (!establishment) {
    return "Matricule automatique";
  }

  const sequence = String(establishment.studentMatriculeNextNumber ?? 1).padStart(
    establishment.studentMatriculePadding ?? 4,
    "0"
  );

  return (establishment.studentMatriculeFormat ?? "{PREFIX}-{YEAR}-{SEQ}")
    .replace(/\{PREFIX\}/g, establishment.studentMatriculePrefix ?? "SB")
    .replace(/\{YEAR\}/g, matriculeYear(activeYear?.name))
    .replace(/\{SEQ\}/g, sequence);
}

export function SchoolDashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [structureTab, setStructureTab] = useState<StructureTab>("levels");
  const [paymentTab, setPaymentTab] = useState<PaymentTab>("fees");
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [alerts, setAlerts] = useState<string[]>(["API locale non chargee."]);
  const [online, setOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [yearSaving, setYearSaving] = useState(false);
  const [structureSaving, setStructureSaving] = useState(false);
  const [studentSaving, setStudentSaving] = useState(false);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [documentActionId, setDocumentActionId] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentOverview, setPaymentOverview] = useState<PaymentsOverview | null>(null);
  const [selectedPaymentStudentId, setSelectedPaymentStudentId] = useState("");
  const [editingFeeItemId, setEditingFeeItemId] = useState("");
  const [lastReceipt, setLastReceipt] = useState<PaymentRecord | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("");
  const [selectedDocumentStudentId, setSelectedDocumentStudentId] = useState("");
  const [studentDocuments, setStudentDocuments] = useState<StudentDocument[]>([]);
  const [form, setForm] = useState({
    name: "",
    type: "HIGH_SCHOOL",
    city: "Ouagadougou",
    phone: "",
    email: ""
  });
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    legalName: "",
    type: "HIGH_SCHOOL",
    address: "",
    city: "Ouagadougou",
    country: "Burkina Faso",
    phone: "",
    email: "",
    motto: "",
    currency: "XOF",
    studentMatriculePrefix: "SB",
    studentMatriculeFormat: "{PREFIX}-{YEAR}-{SEQ}",
    studentMatriculeNextNumber: 1,
    studentMatriculePadding: 4
  });
  const [yearForm, setYearForm] = useState({
    name: "2026-2027",
    startsAt: "2026-09-01",
    endsAt: "2027-07-31",
    status: "ACTIVE" as "DRAFT" | "ACTIVE"
  });
  const [levelForm, setLevelForm] = useState({
    name: "",
    code: "",
    orderIndex: 0
  });
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    subjectGroup: ""
  });
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [assignForm, setAssignForm] = useState({
    classId: "",
    subjectId: "",
    coefficient: "1"
  });
  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    birthPlace: "",
    nationality: "Burkinabe",
    classId: "",
    enrollmentType: "NEW" as "NEW" | "REENROLLMENT" | "TRANSFER",
    primaryGuardian: emptyGuardianForm("Pere"),
    secondaryGuardian: emptyGuardianForm("Mere")
  });
  const [documentForm, setDocumentForm] = useState<{
    documentType: string;
    label: string;
    file: File | null;
  }>({
    documentType: "BIRTH_CERTIFICATE",
    label: "",
    file: null
  });
  const [feeForm, setFeeForm] = useState({
    name: "",
    amount: "",
    dueDate: "",
    classId: ""
  });
  const [feeEditForm, setFeeEditForm] = useState({
    name: "",
    amount: "",
    dueDate: "",
    classId: ""
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH" as "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CHECK" | "OTHER",
    reference: "",
    receivedBy: ""
  });

  const selected = useMemo(
    () => establishments.find((item) => item.id === selectedId) ?? null,
    [establishments, selectedId]
  );
  const activeYear = useMemo(() => {
    return (
      selected?.academicYears?.find((year) => year.id === selected.activeAcademicYearId) ??
      selected?.academicYears?.find((year) => year.status === "ACTIVE") ??
      null
    );
  }, [selected]);
  const activeClasses = useMemo(() => {
    if (!activeYear) {
      return classes;
    }

    return classes.filter((schoolClass) => schoolClass.academicYearId === activeYear.id);
  }, [activeYear, classes]);
  const selectedDocumentStudent = useMemo(
    () => students.find((student) => student.id === selectedDocumentStudentId) ?? null,
    [selectedDocumentStudentId, students]
  );
  const selectedPaymentStudent = useMemo(
    () => paymentOverview?.students.find((student) => student.id === selectedPaymentStudentId) ?? null,
    [paymentOverview, selectedPaymentStudentId]
  );
  const filteredStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    const filtered = students.filter((student) => {
      const enrollment = student.enrollments?.[0];
      if (studentClassFilter && enrollment?.classId !== studentClassFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchable = [
        student.firstName,
        student.lastName,
        student.matricule,
        student.enrollments?.[0]?.class?.name ?? "",
        ...(student.guardians?.flatMap((item) => [
          item.guardian.firstName,
          item.guardian.lastName,
          item.guardian.phone ?? "",
          item.relationship
        ]) ?? [])
      ]
        .join(" - ")
        .toLowerCase();
      const suggestion = `${student.matricule} - ${student.lastName} ${student.firstName}`.toLowerCase();

      return searchable.includes(search) || suggestion.includes(search);
    });

    return [...filtered].sort((left, right) => {
      const leftClass = left.enrollments?.[0]?.class?.name ?? "";
      const rightClass = right.enrollments?.[0]?.class?.name ?? "";
      return (
        leftClass.localeCompare(rightClass) ||
        left.lastName.localeCompare(right.lastName) ||
        left.firstName.localeCompare(right.firstName)
      );
    });
  }, [studentClassFilter, studentSearch, students]);
  const studentClassStats = useMemo(() => {
    return activeClasses
      .map((schoolClass) => {
        const count = students.filter(
          (student) => student.enrollments?.[0]?.classId === schoolClass.id
        ).length;
        return {
          id: schoolClass.id,
          name: schoolClass.name,
          count,
          capacity: schoolClass.capacity ?? null
        };
      })
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
  }, [activeClasses, students]);
  const maxClassStudentCount = Math.max(1, ...studentClassStats.map((item) => item.count));
  const genderStats = useMemo(() => {
    const girls = students.filter((student) => student.gender === "FEMALE").length;
    const boys = students.filter((student) => student.gender === "MALE").length;
    const unspecified = Math.max(0, students.length - girls - boys);
    return [
      { label: "Filles", value: girls },
      { label: "Garcons", value: boys },
      { label: "Non renseigne", value: unspecified }
    ];
  }, [students]);
  const maxGenderCount = Math.max(1, ...genderStats.map((item) => item.value));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    void loadEstablishments();
  }, [mounted]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    void loadDashboard(selectedId);
    void loadStructure(selectedId);
    void loadStudents(selectedId);
    void loadPayments(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!students.length) {
      setSelectedDocumentStudentId("");
      setStudentDocuments([]);
      return;
    }

    setSelectedDocumentStudentId((current) =>
      current && students.some((student) => student.id === current) ? current : students[0].id
    );
  }, [students]);

  useEffect(() => {
    if (!selected || !selectedDocumentStudentId) {
      return;
    }

    void loadStudentDocuments(selected.id, selectedDocumentStudentId);
  }, [selected, selectedDocumentStudentId]);

  useEffect(() => {
    const paymentStudents = paymentOverview?.students ?? [];
    if (!paymentStudents.length) {
      setSelectedPaymentStudentId("");
      return;
    }

    setSelectedPaymentStudentId((current) => {
      if (current && paymentStudents.some((student) => student.id === current)) {
        return current;
      }

      return paymentStudents.find((student) => student.balance > 0)?.id ?? paymentStudents[0].id;
    });
  }, [paymentOverview]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    setSettingsForm({
      name: selected.name ?? "",
      legalName: selected.legalName ?? "",
      type: selected.type ?? "HIGH_SCHOOL",
      address: selected.address ?? "",
      city: selected.city ?? "Ouagadougou",
      country: selected.country ?? "Burkina Faso",
      phone: selected.phone ?? "",
      email: selected.email ?? "",
      motto: selected.motto ?? "",
      currency: selected.currency ?? "XOF",
      studentMatriculePrefix: selected.studentMatriculePrefix ?? "SB",
      studentMatriculeFormat: selected.studentMatriculeFormat ?? "{PREFIX}-{YEAR}-{SEQ}",
      studentMatriculeNextNumber: selected.studentMatriculeNextNumber ?? 1,
      studentMatriculePadding: selected.studentMatriculePadding ?? 4
    });
  }, [selected]);

  async function loadEstablishments() {
    try {
      const data = await getEstablishments();
      setEstablishments(data);
      setSelectedId((current) => current || data[0]?.id || "");
      setOnline(true);
      setAlerts(data.length ? [] : ["Aucun etablissement cree pour le moment."]);
    } catch {
      setOnline(false);
      setAlerts(["API locale indisponible. Demarrer le serveur pour charger les donnees."]);
    }
  }

  async function loadDashboard(establishmentId: string) {
    try {
      const data = await getDashboard(establishmentId);
      setMetrics(data.metrics);
      setAlerts(data.alerts.length ? data.alerts : ["Aucune alerte active."]);
      setOnline(true);
    } catch {
      setOnline(false);
      setAlerts(["Impossible de charger le tableau de bord de cet etablissement."]);
    }
  }

  async function loadStructure(establishmentId: string) {
    try {
      const [levelsData, subjectsData, classesData] = await Promise.all([
        getLevels(establishmentId),
        getSubjects(establishmentId),
        getClasses(establishmentId)
      ]);
      setLevels(levelsData);
      setSubjects(subjectsData);
      setClasses(classesData);
    } catch {
      setAlerts(["Impossible de charger la structure scolaire. Verifier l'API."]);
    }
  }

  async function loadStudents(establishmentId: string) {
    try {
      const data = await getStudents(establishmentId);
      setStudents(data);
    } catch {
      setAlerts(["Impossible de charger les eleves. Verifier l'API."]);
    }
  }

  async function loadPayments(establishmentId: string) {
    try {
      const data = await getPaymentsOverview(establishmentId);
      setPaymentOverview(data);
    } catch {
      setPaymentOverview(null);
      setAlerts(["Impossible de charger les paiements. Verifier l'API."]);
    }
  }

  async function loadStudentDocuments(establishmentId: string, studentId: string) {
    try {
      const data = await getStudentDocuments(establishmentId, studentId);
      setStudentDocuments(data);
    } catch {
      setAlerts(["Impossible de charger les documents de cet eleve."]);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidPhone(form.phone)) {
      setAlerts(["Le telephone doit contenir exactement 8 chiffres, par exemple 72007342."]);
      return;
    }

    if (!isValidEmail(form.email)) {
      setAlerts(["L'email doit etre complet, par exemple contact@ecole.bf."]);
      return;
    }

    setSaving(true);

    try {
      const created = await createEstablishment(form);
      setEstablishments((items) => [created, ...items]);
      setSelectedId(created.id);
      setForm({
        name: "",
        type: "HIGH_SCHOOL",
        city: "Ouagadougou",
        phone: "",
        email: ""
      });
      setOnline(true);
      setAlerts(["Etablissement cree avec licence d'essai et modules MVP actifs."]);
    } catch (error) {
      setAlerts([
        errorMessage(error, "Creation impossible. Verifier que l'API et PostgreSQL sont demarres.")
      ]);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected) {
      setAlerts(["Creer ou selectionner un etablissement avant de modifier les parametres."]);
      return;
    }

    if (!isValidPhone(settingsForm.phone)) {
      setAlerts(["Le telephone doit contenir exactement 8 chiffres, par exemple 72007342."]);
      return;
    }

    if (!isValidEmail(settingsForm.email)) {
      setAlerts(["L'email doit etre complet, par exemple contact@ecole.bf."]);
      return;
    }

    setSettingsSaving(true);
    try {
      const updated = await updateEstablishment(selected.id, settingsForm);
      replaceEstablishment(updated);
      setAlerts(["Parametres enregistres : l'identite de l'etablissement a ete mise a jour."]);
      setOnline(true);
    } catch (error) {
      setAlerts([errorMessage(error, "Enregistrement impossible. Verifier que l'API est demarree.")]);
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleCreateYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected) {
      setAlerts(["Creer ou selectionner un etablissement avant d'ajouter une annee scolaire."]);
      return;
    }

    setYearSaving(true);
    try {
      await createAcademicYear(selected.id, yearForm);
      await refreshSelectedEstablishment(selected.id);
      setAlerts([
        yearForm.status === "ACTIVE"
          ? "Annee scolaire creee et activee."
          : "Annee scolaire creee en brouillon."
      ]);
      setOnline(true);
    } catch {
      setAlerts(["Creation de l'annee scolaire impossible. Verifier les dates et l'API."]);
    } finally {
      setYearSaving(false);
    }
  }

  async function handleActivateYear(year: AcademicYear) {
    if (!selected) {
      return;
    }

    setYearSaving(true);
    try {
      await activateAcademicYear(selected.id, year.id);
      await refreshSelectedEstablishment(selected.id);
      setAlerts([`Annee scolaire ${year.name} activee.`]);
    } catch {
      setAlerts(["Activation impossible. Verifier que l'API est disponible."]);
    } finally {
      setYearSaving(false);
    }
  }

  async function refreshSelectedEstablishment(establishmentId: string) {
    const data = await getEstablishments();
    setEstablishments(data);
    setSelectedId(establishmentId);
    await loadDashboard(establishmentId);
    await loadStructure(establishmentId);
    await loadStudents(establishmentId);
  }

  function replaceEstablishment(updated: Establishment) {
    setEstablishments((items) =>
      items.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  async function handleCreateLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setAlerts(["Creer ou selectionner un etablissement avant d'ajouter un niveau."]);
      return;
    }

    setStructureSaving(true);
    try {
      await createLevel(selected.id, levelForm);
      setLevelForm({ name: "", code: "", orderIndex: 0 });
      await loadStructure(selected.id);
      setAlerts(["Niveau ajoute. Vous pouvez maintenant creer une classe liee a ce niveau."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Creation du niveau impossible.")]);
    } finally {
      setStructureSaving(false);
    }
  }

  async function handleCreateSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setAlerts(["Creer ou selectionner un etablissement avant d'ajouter une matiere."]);
      return;
    }

    setStructureSaving(true);
    try {
      await createSubject(selected.id, subjectForm);
      setSubjectForm({ name: "", code: "", subjectGroup: "" });
      await loadStructure(selected.id);
      setAlerts(["Matiere ajoutee. Vous pouvez l'affecter a une classe avec un coefficient."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Creation de la matiere impossible.")]);
    } finally {
      setStructureSaving(false);
    }
  }

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !activeYear) {
      setAlerts(["Creer une annee scolaire active avant d'ajouter une classe."]);
      return;
    }

    const tuitionTranches = classForm.tuitionEnabled
      ? classForm.tuitionTranches.filter((tranche) => tranche.name.trim() || tranche.amount.trim())
      : [];
    for (const tranche of tuitionTranches) {
      const amount = Number(tranche.amount);
      if (!tranche.name.trim() || !Number.isInteger(amount) || amount <= 0) {
        setAlerts(["Chaque tranche de scolarite doit avoir un libelle et un montant entier positif."]);
        return;
      }
    }

    setStructureSaving(true);
    try {
      const createdClass = await createClass(selected.id, {
        academicYearId: activeYear.id,
        levelId: classForm.levelId || undefined,
        name: classForm.name,
        code: classForm.code,
        capacity: classForm.capacity ? Number(classForm.capacity) : undefined
      });
      if (tuitionTranches.length) {
        for (const tranche of tuitionTranches) {
          await createFeeItem(selected.id, {
            academicYearId: activeYear.id,
            classId: createdClass.id,
            name: tranche.name,
            amount: Number(tranche.amount),
            dueDate: tranche.dueDate
          });
        }
      }
      setClassForm(emptyClassForm());
      await loadStructure(selected.id);
      await loadPayments(selected.id);
      await loadDashboard(selected.id);
      setAlerts([
        tuitionTranches.length
          ? "Classe ajoutee avec ses tranches de scolarite. Affecter les frais aux eleves apres inscription."
          : "Classe ajoutee pour l'annee scolaire active."
      ]);
    } catch (error) {
      setAlerts([errorMessage(error, "Creation de la classe impossible.")]);
    } finally {
      setStructureSaving(false);
    }
  }

  async function handleAssignSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      return;
    }

    setStructureSaving(true);
    try {
      await assignSubjectToClass(selected.id, assignForm.classId, {
        subjectId: assignForm.subjectId,
        coefficient: Number(assignForm.coefficient || 1)
      });
      setAssignForm({ classId: "", subjectId: "", coefficient: "1" });
      await loadStructure(selected.id);
      setAlerts(["Matiere affectee a la classe avec son coefficient."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Affectation impossible.")]);
    } finally {
      setStructureSaving(false);
    }
  }

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected) {
      setAlerts(["Creer ou selectionner un etablissement avant d'inscrire un eleve."]);
      return;
    }

    if (!activeClasses.length) {
      setAlerts(["Creer au moins une classe pour l'annee active avant d'inscrire un eleve."]);
      return;
    }

    if (!studentForm.classId) {
      setAlerts(["Choisir la classe de l'eleve avant d'enregistrer l'inscription."]);
      return;
    }

    const primaryGuardian = studentForm.primaryGuardian;
    const secondaryGuardian = studentForm.secondaryGuardian;
    const secondaryHasData = [
      secondaryGuardian.firstName,
      secondaryGuardian.lastName,
      secondaryGuardian.phone,
      secondaryGuardian.email,
      secondaryGuardian.profession,
      secondaryGuardian.address
    ].some((value) => value.trim() !== "");

    if (!primaryGuardian.firstName.trim() || !primaryGuardian.lastName.trim() || !primaryGuardian.phone.trim()) {
      setAlerts(["Renseigner le responsable principal avec nom, prenom et telephone."]);
      return;
    }

    if (!isValidPhone(primaryGuardian.phone)) {
      setAlerts(["Le telephone du responsable principal doit contenir exactement 8 chiffres."]);
      return;
    }

    if (primaryGuardian.email && !isValidEmail(primaryGuardian.email)) {
      setAlerts(["L'email du responsable principal doit etre complet, par exemple parent@ecole.bf."]);
      return;
    }

    if (
      secondaryHasData &&
      (!secondaryGuardian.firstName.trim() ||
        !secondaryGuardian.lastName.trim() ||
        !secondaryGuardian.phone.trim())
    ) {
      setAlerts(["Completer le contact secondaire ou laisser tous ses champs vides."]);
      return;
    }

    if (secondaryHasData && !isValidPhone(secondaryGuardian.phone)) {
      setAlerts(["Le telephone du contact secondaire doit contenir exactement 8 chiffres."]);
      return;
    }

    if (secondaryHasData && secondaryGuardian.email && !isValidEmail(secondaryGuardian.email)) {
      setAlerts(["L'email du contact secondaire doit etre complet, par exemple parent@ecole.bf."]);
      return;
    }

    setStudentSaving(true);
    try {
      const gender = studentForm.gender as "FEMALE" | "MALE" | "";
      const guardians = [
        {
          firstName: primaryGuardian.firstName.trim(),
          lastName: primaryGuardian.lastName.trim(),
          relationship: primaryGuardian.relationship.trim(),
          phone: primaryGuardian.phone,
          email: primaryGuardian.email.trim() || undefined,
          profession: primaryGuardian.profession.trim() || undefined,
          address: primaryGuardian.address.trim() || undefined,
          isPrimary: true
        },
        ...(secondaryHasData
          ? [
              {
                firstName: secondaryGuardian.firstName.trim(),
                lastName: secondaryGuardian.lastName.trim(),
                relationship: secondaryGuardian.relationship.trim(),
                phone: secondaryGuardian.phone,
                email: secondaryGuardian.email.trim() || undefined,
                profession: secondaryGuardian.profession.trim() || undefined,
                address: secondaryGuardian.address.trim() || undefined,
                isPrimary: false
              }
            ]
          : [])
      ];
      await createStudent(selected.id, {
        firstName: studentForm.firstName.trim(),
        lastName: studentForm.lastName.trim(),
        gender: gender || undefined,
        birthDate: studentForm.birthDate,
        birthPlace: studentForm.birthPlace.trim(),
        nationality: studentForm.nationality.trim(),
        classId: studentForm.classId,
        enrollmentType: studentForm.enrollmentType,
        guardians
      });
      setStudentForm({
        firstName: "",
        lastName: "",
        gender: "",
        birthDate: "",
        birthPlace: "",
        nationality: "Burkinabe",
        classId: studentForm.classId,
        enrollmentType: "NEW",
        primaryGuardian: emptyGuardianForm("Pere"),
        secondaryGuardian: emptyGuardianForm("Mere")
      });
      await loadStudents(selected.id);
      await loadDashboard(selected.id);
      setAlerts(["Eleve inscrit dans la classe selectionnee."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Inscription impossible. Verifier les champs et l'API.")]);
    } finally {
      setStudentSaving(false);
    }
  }

  async function handleUploadStudentDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected || !selectedDocumentStudent) {
      setAlerts(["Selectionner un eleve avant d'ajouter un document."]);
      return;
    }

    if (!documentForm.file) {
      setAlerts(["Choisir un fichier PDF ou image avant d'enregistrer le document."]);
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(documentForm.file.type)) {
      setAlerts(["Document refuse : seuls PDF, JPG, PNG et WEBP sont acceptes."]);
      return;
    }

    if (documentForm.file.size > 8 * 1024 * 1024) {
      setAlerts(["Document refuse : la taille maximale est 8 Mo."]);
      return;
    }

    setDocumentSaving(true);
    try {
      const base64Content = await fileToBase64(documentForm.file);
      await uploadStudentDocument(selected.id, selectedDocumentStudent.id, {
        documentType: documentForm.documentType,
        label: documentForm.label.trim(),
        originalName: documentForm.file.name,
        mimeType: documentForm.file.type,
        base64Content
      });
      setDocumentForm({
        documentType: "BIRTH_CERTIFICATE",
        label: "",
        file: null
      });
      await loadStudentDocuments(selected.id, selectedDocumentStudent.id);
      await loadStudents(selected.id);
      setAlerts(["Document administratif ajoute au dossier de l'eleve."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Enregistrement du document impossible.")]);
    } finally {
      setDocumentSaving(false);
    }
  }

  function currentStudentDocumentFileUrl(studentDocument: StudentDocument, download = false) {
    if (!selected || !selectedDocumentStudent) {
      return "#";
    }

    return studentDocumentFileUrl(
      selected.id,
      selectedDocumentStudent.id,
      studentDocument.id,
      download
    );
  }

  function handlePrintStudentDocument(studentDocument: StudentDocument) {
    if (!selected || !selectedDocumentStudent) {
      setAlerts(["Selectionner un eleve avant d'imprimer un document."]);
      return;
    }

    const fileUrl = currentStudentDocumentFileUrl(studentDocument);
    const title = documentDisplayName(studentDocument);
    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      setAlerts(["Fenetre d'impression bloquee. Autoriser les popups pour imprimer."]);
      return;
    }

    const safeTitle = escapeHtml(title);
    const safeUrl = escapeHtml(fileUrl);
    const previewMarkup = studentDocument.mimeType.startsWith("image/")
      ? `<img src="${safeUrl}" alt="${safeTitle}" onload="setTimeout(function(){ window.print(); }, 300)" />`
      : `<iframe src="${safeUrl}" title="${safeTitle}" onload="setTimeout(function(){ window.print(); }, 700)"></iframe>`;

    printWindow.document.write(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #07130d; }
    header { padding: 12px 16px; border-bottom: 1px solid #d7ded7; }
    h1 { margin: 0; font-size: 16px; }
    p { margin: 4px 0 0; color: #637065; font-size: 12px; }
    iframe { width: 100vw; height: calc(100vh - 58px); border: 0; }
    img { display: block; max-width: 100%; max-height: calc(100vh - 58px); margin: 0 auto; }
    @media print {
      header { display: none; }
      iframe, img { height: 100vh; max-height: 100vh; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${safeTitle}</h1>
    <p>${escapeHtml(selectedDocumentStudent.matricule)} - ${escapeHtml(
      selectedDocumentStudent.lastName
    )} ${escapeHtml(selectedDocumentStudent.firstName)}</p>
  </header>
  ${previewMarkup}
</body>
</html>`);
    printWindow.document.close();
  }

  async function handleDeleteStudentDocument(studentDocument: StudentDocument) {
    if (!selected || !selectedDocumentStudent) {
      setAlerts(["Selectionner un eleve avant de supprimer un document."]);
      return;
    }

    const confirmed = window.confirm(
      `Supprimer le document "${documentDisplayName(studentDocument)}" du dossier ?`
    );
    if (!confirmed) {
      return;
    }

    setDocumentActionId(studentDocument.id);
    try {
      await deleteStudentDocument(selected.id, selectedDocumentStudent.id, studentDocument.id);
      await loadStudentDocuments(selected.id, selectedDocumentStudent.id);
      await loadStudents(selected.id);
      setAlerts(["Document supprime du dossier de l'eleve."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Suppression du document impossible.")]);
    } finally {
      setDocumentActionId("");
    }
  }

  async function handleCreateFeeItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected || !paymentOverview) {
      setAlerts(["Creer ou selectionner un etablissement avant d'ajouter des frais."]);
      return;
    }

    const amount = Number(feeForm.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setAlerts(["Le montant du frais doit etre un nombre entier positif."]);
      return;
    }

    setPaymentSaving(true);
    try {
      await createFeeItem(selected.id, {
        academicYearId: paymentOverview.academicYear.id,
        name: feeForm.name,
        amount,
        dueDate: feeForm.dueDate,
        classId: feeForm.classId
      });
      setFeeForm({ name: "", amount: "", dueDate: "", classId: "" });
      await loadPayments(selected.id);
      setAlerts(["Frais cree. Il reste a l'affecter aux eleves concernes."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Creation du frais impossible.")]);
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleAssignFeeItem(feeItemId: string, classId?: string | null) {
    if (!selected) {
      setAlerts(["Selectionner un etablissement avant d'affecter un frais."]);
      return;
    }

    setPaymentSaving(true);
    try {
      const result = await assignFeeItem(selected.id, feeItemId, {
        target: classId ? "CLASS" : "ALL_ACTIVE",
        classId: classId ?? undefined
      });
      await loadPayments(selected.id);
      setAlerts([
        `Frais affecte : ${result.assigned} nouveau(x), ${result.skipped} deja existant(s).`
      ]);
    } catch (error) {
      setAlerts([errorMessage(error, "Affectation du frais impossible.")]);
    } finally {
      setPaymentSaving(false);
    }
  }

  function startEditFeeItem(feeItem: PaymentsOverview["feeItems"][number]) {
    setEditingFeeItemId(feeItem.id);
    setFeeEditForm({
      name: feeItem.name,
      amount: String(Math.round(feeItem.amount)),
      dueDate: feeItem.dueDate ? feeItem.dueDate.slice(0, 10) : "",
      classId: feeItem.classId ?? ""
    });
  }

  async function handleUpdateFeeItem(feeItemId: string) {
    if (!selected) {
      setAlerts(["Selectionner un etablissement avant de modifier un frais."]);
      return;
    }

    const amount = Number(feeEditForm.amount);
    if (!feeEditForm.name.trim() || !Number.isInteger(amount) || amount <= 0) {
      setAlerts(["Le frais doit avoir un libelle et un montant entier positif."]);
      return;
    }

    setPaymentSaving(true);
    try {
      await updateFeeItem(selected.id, feeItemId, {
        name: feeEditForm.name,
        amount,
        dueDate: feeEditForm.dueDate,
        classId: feeEditForm.classId
      });
      setEditingFeeItemId("");
      await loadPayments(selected.id);
      setAlerts(["Frais mis a jour. Les lignes non payees ont ete ajustees."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Modification du frais impossible.")]);
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleDeleteFeeItem(feeItemId: string) {
    if (!selected) {
      setAlerts(["Selectionner un etablissement avant de supprimer un frais."]);
      return;
    }

    if (!window.confirm("Supprimer ce frais et ses affectations non payees ?")) {
      return;
    }

    setPaymentSaving(true);
    try {
      await deleteFeeItem(selected.id, feeItemId);
      await loadPayments(selected.id);
      setAlerts(["Frais supprime."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Suppression du frais impossible.")]);
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleCollectPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected || !paymentOverview || !selectedPaymentStudent) {
      setAlerts(["Selectionner un eleve avant d'encaisser un paiement."]);
      return;
    }

    const amount = Number(paymentForm.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setAlerts(["Le montant encaisse doit etre un nombre entier positif."]);
      return;
    }

    if (amount > selectedPaymentStudent.balance) {
      setAlerts([
        `Montant refuse : le reste a payer est de ${formatMoney(
          selectedPaymentStudent.balance,
          selected.currency
        )}.`
      ]);
      return;
    }

    setPaymentSaving(true);
    try {
      const payment = await collectPayment(selected.id, {
        studentId: selectedPaymentStudent.id,
        academicYearId: paymentOverview.academicYear.id,
        amount,
        method: paymentForm.method,
        reference: paymentForm.reference,
        receivedBy: paymentForm.receivedBy
      });
      setLastReceipt(payment);
      setPaymentForm({ ...paymentForm, amount: "", reference: "" });
      await loadPayments(selected.id);
      await loadDashboard(selected.id);
      setAlerts(["Paiement enregistre. Le recu est pret a imprimer."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Encaissement impossible.")]);
    } finally {
      setPaymentSaving(false);
    }
  }

  function printPaymentReceipt(payment: PaymentRecord) {
    const establishment = paymentOverview?.establishment ?? selected;
    if (!establishment) {
      setAlerts(["Impossible d'imprimer le recu sans etablissement selectionne."]);
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (!printWindow) {
      setAlerts(["Fenetre d'impression bloquee. Autoriser les popups pour imprimer."]);
      return;
    }

    const studentName = `${payment.student?.lastName ?? ""} ${payment.student?.firstName ?? ""}`.trim();
    const logoMarkup = establishment.logoUrl
      ? `<img class="logo" src="${escapeHtml(establishment.logoUrl)}" alt="${escapeHtml(
          establishment.name
        )}" />`
      : `<div class="logo-fallback">${escapeHtml(establishment.name.slice(0, 2).toUpperCase())}</div>`;
    const allocationRows =
      payment.allocations
        ?.map(
          (allocation) => `<tr>
            <td>${escapeHtml(allocation.studentFeeAssignment?.feeItem?.name ?? "Frais scolaire")}</td>
            <td>${formatMoney(allocation.amount, establishment.currency)}</td>
          </tr>`
        )
        .join("") || "";

    printWindow.document.write(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(payment.receiptNumber)}</title>
  <style>
    body { margin: 0; padding: 32px; font-family: Arial, sans-serif; color: #111827; }
    .receipt { max-width: 760px; margin: 0 auto; border: 1px solid #d1d5db; padding: 24px; }
    header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #166534; padding-bottom: 16px; }
    .logo { width: 70px; height: 70px; object-fit: contain; }
    .logo-fallback { display: grid; width: 70px; height: 70px; place-items: center; background: #e8b923; font-weight: 800; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 22px; }
    h2 { margin-top: 22px; font-size: 18px; text-align: center; text-transform: uppercase; }
    .muted { color: #6b7280; font-size: 13px; margin-top: 4px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 22px 0; }
    .box { border: 1px solid #e5e7eb; padding: 10px; }
    .box span { display: block; color: #6b7280; font-size: 12px; }
    .box strong { display: block; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    th { background: #f3f4f6; }
    .total { text-align: right; margin-top: 16px; font-size: 18px; font-weight: 800; }
    footer { display: flex; justify-content: space-between; margin-top: 44px; font-size: 13px; }
    @media print { body { padding: 0; } .receipt { border: 0; } }
  </style>
</head>
<body>
  <div class="receipt">
    <header>
      ${logoMarkup}
      <div>
        <h1>${escapeHtml(establishment.name)}</h1>
        <p class="muted">${escapeHtml(establishment.city ?? "")} - ${escapeHtml(
          establishment.country
        )}</p>
        <p class="muted">${escapeHtml(establishment.phone ?? "")} ${escapeHtml(
          establishment.email ?? ""
        )}</p>
      </div>
    </header>
    <h2>Recu de paiement</h2>
    <div class="meta">
      <div class="box"><span>Numero</span><strong>${escapeHtml(payment.receiptNumber)}</strong></div>
      <div class="box"><span>Date</span><strong>${new Date(payment.paidAt).toLocaleString(
        "fr-FR"
      )}</strong></div>
      <div class="box"><span>Eleve</span><strong>${escapeHtml(studentName)}</strong></div>
      <div class="box"><span>Matricule</span><strong>${escapeHtml(
        payment.student?.matricule ?? ""
      )}</strong></div>
      <div class="box"><span>Methode</span><strong>${escapeHtml(
        paymentMethodLabel(payment.method)
      )}</strong></div>
      <div class="box"><span>Reference</span><strong>${escapeHtml(payment.reference ?? "-")}</strong></div>
    </div>
    <table>
      <thead><tr><th>Frais regle</th><th>Montant</th></tr></thead>
      <tbody>${allocationRows}</tbody>
    </table>
    <div class="total">Total encaisse : ${formatMoney(payment.amount, establishment.currency)}</div>
    <footer>
      <span>Caissier : ${escapeHtml(payment.receivedBy ?? "-")}</span>
      <span>Signature</span>
    </footer>
  </div>
  <script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 300); });</script>
</body>
</html>`);
    printWindow.document.close();
  }

  if (!mounted) {
    return <DashboardLoadingShell />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SB</div>
          <div>
            <strong>SchoolSaaS BF</strong>
            <span>Gestion hybride locale</span>
          </div>
        </div>

        <nav className="nav-section" aria-label="Navigation principale">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label}>
                    <button
                      className={`nav-button ${activeView === item.view ? "active" : ""}`}
                      title={item.label}
                      type="button"
                      onClick={() => setActiveView(item.view)}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                    {"submenu" in item && item.submenu && activeView === item.view ? (
                      <div className="nav-submenu">
                        {item.submenu.map((tab) => (
                          <button
                            className={
                              (item.view === "structure" && structureTab === tab.value) ||
                              (item.view === "payments" && paymentTab === tab.value)
                                ? "active"
                                : ""
                            }
                            key={tab.value}
                            type="button"
                            onClick={() => {
                              if (item.view === "structure") {
                                setStructureTab(tab.value as StructureTab);
                              }
                              if (item.view === "payments") {
                                setPaymentTab(tab.value as PaymentTab);
                              }
                            }}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>{selected?.name ?? "Administration etablissement"}</h1>
            <p>{selected ? `${selected.city ?? "Ville non renseignee"} - ${selected.country}` : "MVP local en preparation"}</p>
          </div>
          <div className="topbar-actions">
            {establishments.length > 1 ? (
              <select
                className="compact-select"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                title="Changer d'etablissement"
              >
                {establishments.map((establishment) => (
                  <option key={establishment.id} value={establishment.id}>
                    {establishment.name}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="status-pill">
              <span className={`status-dot ${online ? "online" : ""}`} />
              {online ? "API connectee" : "API hors ligne"}
            </div>
          </div>
        </header>

        <div className={activeView === "dashboard" ? "dashboard-grid" : "dashboard-grid full-width"}>
          <section>
            <div className="metrics-grid">
              <MetricCard label="Eleves actifs" value={metrics.students} tone="green" icon={GraduationCap} />
              <MetricCard label="Classes" value={metrics.classes} tone="teal" icon={LibraryBig} />
              <MetricCard label="Enseignants" value={metrics.teachers} tone="wine" icon={Users} />
              <MetricCard label="Paiements" value={metrics.payments} tone="amber" icon={ReceiptText} />
            </div>

            {activeView === "settings" ? (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Parametrage</h2>
                  <span>{activeYear ? `Annee active : ${activeYear.name}` : "Aucune annee active"}</span>
                </div>
                <Settings size={20} />
              </div>

              <div className="settings-grid">
                <form className="settings-block" onSubmit={handleUpdateSettings}>
                  <div className="section-title">
                    <strong>Etablissement</strong>
                    <span>Identite administrative</span>
                  </div>
                  <div className="setup-form">
                    <label className="field full">
                      <span className="required">Nom public</span>
                      <input
                        disabled={!selected}
                        required
                        placeholder="Exemple : College Prive Evangelique II"
                        value={settingsForm.name}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, name: event.target.value })
                        }
                      />
                    </label>
                    <label className="field full">
                      <span>Nom legal</span>
                      <input
                        disabled={!selected}
                        placeholder="Nom officiel si different"
                        value={settingsForm.legalName}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, legalName: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="required">Type</span>
                      <select
                        disabled={!selected}
                        value={settingsForm.type}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, type: event.target.value })
                        }
                      >
                        <option value="PRIMARY">Primaire</option>
                        <option value="COLLEGE">College</option>
                        <option value="HIGH_SCHOOL">Lycee</option>
                        <option value="INSTITUTE">Institut</option>
                        <option value="UNIVERSITY">Universite</option>
                        <option value="TRAINING_CENTER">Centre de formation</option>
                      </select>
                    </label>
                    <label className="field">
                      <span className="required">Devise</span>
                      <input
                        disabled={!selected}
                        required
                        maxLength={8}
                        placeholder="XOF"
                        value={settingsForm.currency}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, currency: event.target.value.toUpperCase() })
                        }
                      />
                    </label>
                    <label className="field full">
                      <span>Adresse</span>
                      <input
                        disabled={!selected}
                        placeholder="Exemple : Secteur 12, avenue de la Nation"
                        value={settingsForm.address}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, address: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="required">Ville</span>
                      <input
                        disabled={!selected}
                        required
                        placeholder="Exemple : Bobo-Dioulasso"
                        value={settingsForm.city}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, city: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="required">Pays</span>
                      <input
                        disabled={!selected}
                        required
                        placeholder="Burkina Faso"
                        value={settingsForm.country}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, country: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Telephone</span>
                      <input
                        disabled={!selected}
                        inputMode="numeric"
                        maxLength={8}
                        pattern="[0-9]{8}"
                        placeholder="Exemple : 72007342"
                        value={settingsForm.phone}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, phone: cleanPhone(event.target.value) })
                        }
                      />
                      <small>8 chiffres exactement si renseigne.</small>
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input
                        disabled={!selected}
                        type="email"
                        pattern="^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$"
                        placeholder="Exemple : contact@ecole.bf"
                        value={settingsForm.email}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, email: event.target.value })
                        }
                      />
                      <small>Doit contenir un domaine complet.</small>
                    </label>
                    <label className="field full">
                      <span>Devise de l'etablissement</span>
                      <input
                        disabled={!selected}
                        placeholder="Exemple : Discipline - Travail - Succes"
                        value={settingsForm.motto}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, motto: event.target.value })
                        }
                      />
                    </label>
                    <div className="section-title field full">
                      <strong>Matricule automatique</strong>
                      <span>Format applique a chaque nouvelle inscription</span>
                    </div>
                    <label className="field">
                      <span className="required">Prefixe</span>
                      <input
                        disabled={!selected}
                        required
                        maxLength={12}
                        placeholder="Exemple : CPE2"
                        value={settingsForm.studentMatriculePrefix}
                        onChange={(event) =>
                          setSettingsForm({
                            ...settingsForm,
                            studentMatriculePrefix: event.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, "")
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="required">Prochain numero</span>
                      <input
                        disabled={!selected}
                        min={1}
                        required
                        type="number"
                        value={settingsForm.studentMatriculeNextNumber}
                        onChange={(event) =>
                          setSettingsForm({
                            ...settingsForm,
                            studentMatriculeNextNumber: Math.max(1, Number(event.target.value || 1))
                          })
                        }
                      />
                    </label>
                    <label className="field full">
                      <span className="required">Format</span>
                      <input
                        disabled={!selected}
                        required
                        placeholder="{PREFIX}-{YEAR}-{SEQ}"
                        value={settingsForm.studentMatriculeFormat}
                        onChange={(event) =>
                          setSettingsForm({
                            ...settingsForm,
                            studentMatriculeFormat: event.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9{}_\-/.]/g, "")
                          })
                        }
                      />
                      <small>Jetons autorises : {"{PREFIX}"}, {"{YEAR}"}, {"{SEQ}"}. Le format doit contenir {"{SEQ}"}.</small>
                    </label>
                    <label className="field">
                      <span className="required">Longueur compteur</span>
                      <input
                        disabled={!selected}
                        max={10}
                        min={2}
                        required
                        type="number"
                        value={settingsForm.studentMatriculePadding}
                        onChange={(event) =>
                          setSettingsForm({
                            ...settingsForm,
                            studentMatriculePadding: Math.min(
                              10,
                              Math.max(2, Number(event.target.value || 4))
                            )
                          })
                        }
                      />
                      <small>4 donne 0001, 0002, 0003.</small>
                    </label>
                    <label className="field">
                      <span>Apercu</span>
                      <input
                        readOnly
                        value={settingsForm.studentMatriculeFormat
                          .replace(/\{PREFIX\}/g, settingsForm.studentMatriculePrefix || "SB")
                          .replace(/\{YEAR\}/g, matriculeYear(activeYear?.name))
                          .replace(
                            /\{SEQ\}/g,
                            String(settingsForm.studentMatriculeNextNumber || 1).padStart(
                              settingsForm.studentMatriculePadding || 4,
                              "0"
                            )
                          )}
                      />
                    </label>
                    <button className="primary-button field full" disabled={!selected || settingsSaving} type="submit">
                      {settingsSaving ? <Loader2 size={17} /> : <Save size={17} />}
                      Enregistrer
                    </button>
                  </div>
                </form>

                <div className="settings-block">
                  <div className="section-title">
                    <strong>Annee scolaire</strong>
                    <span>Periode active du travail</span>
                  </div>
                  <form className="setup-form" onSubmit={handleCreateYear}>
                    <label className="field full">
                      <span className="required">Nom</span>
                      <input
                        disabled={!selected}
                        required
                        placeholder="Exemple : 2026-2027"
                        value={yearForm.name}
                        onChange={(event) => setYearForm({ ...yearForm, name: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span className="required">Debut</span>
                      <input
                        disabled={!selected}
                        required
                        type="date"
                        value={yearForm.startsAt}
                        onChange={(event) => setYearForm({ ...yearForm, startsAt: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span className="required">Fin</span>
                      <input
                        disabled={!selected}
                        required
                        type="date"
                        value={yearForm.endsAt}
                        onChange={(event) => setYearForm({ ...yearForm, endsAt: event.target.value })}
                      />
                    </label>
                    <label className="field full">
                      <span className="required">Statut initial</span>
                      <select
                        disabled={!selected}
                        value={yearForm.status}
                        onChange={(event) =>
                          setYearForm({
                            ...yearForm,
                            status: event.target.value as "DRAFT" | "ACTIVE"
                          })
                        }
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="DRAFT">Brouillon</option>
                      </select>
                    </label>
                    <button className="primary-button field full" disabled={!selected || yearSaving} type="submit">
                      {yearSaving ? <Loader2 size={17} /> : <Plus size={17} />}
                      Ajouter l'annee
                    </button>
                  </form>

                  <div className="record-list">
                    {selected?.academicYears?.length ? (
                      selected.academicYears.map((year) => (
                        <div className="record-row" key={year.id}>
                          <div>
                            <strong>{year.name}</strong>
                            <span>{formatDate(year.startsAt)} - {formatDate(year.endsAt)}</span>
                          </div>
                          {year.status === "ACTIVE" ? (
                            <span className="status-badge active">Active</span>
                          ) : (
                            <button
                              className="ghost-button small"
                              disabled={yearSaving}
                              onClick={() => void handleActivateYear(year)}
                              type="button"
                            >
                              <PlayCircle size={15} />
                              Activer
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">Aucune annee scolaire creee.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ) : null}

            {activeView === "structure" ? (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Structure scolaire</h2>
                  <span>Niveaux, classes, matieres et coefficients</span>
                </div>
                <LibraryBig size={20} />
              </div>

              <div className="segmented-tabs" role="tablist" aria-label="Structure scolaire">
                {structureTabs.map((tab) => (
                  <button
                    className={structureTab === tab.value ? "active" : ""}
                    key={tab.value}
                    type="button"
                    onClick={() => setStructureTab(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="structure-grid single">
                {structureTab === "levels" ? (
                <form className="settings-block" onSubmit={handleCreateLevel}>
                  <div className="section-title">
                    <strong>Niveaux</strong>
                    <span>Exemples : 6eme, 3eme, Terminale</span>
                  </div>
                  <div className="setup-form">
                    <label className="field full">
                      <span className="required">Nom du niveau</span>
                      <input
                        disabled={!selected}
                        required
                        placeholder="Exemple : 6eme"
                        value={levelForm.name}
                        onChange={(event) => setLevelForm({ ...levelForm, name: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Code</span>
                      <input
                        disabled={!selected}
                        placeholder="Exemple : 6E"
                        value={levelForm.code}
                        onChange={(event) => setLevelForm({ ...levelForm, code: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Ordre</span>
                      <input
                        disabled={!selected}
                        min={0}
                        type="number"
                        value={levelForm.orderIndex}
                        onChange={(event) =>
                          setLevelForm({ ...levelForm, orderIndex: Number(event.target.value) })
                        }
                      />
                    </label>
                    <button className="primary-button field full" disabled={!selected || structureSaving} type="submit">
                      {structureSaving ? <Loader2 size={17} /> : <Plus size={17} />}
                      Ajouter le niveau
                    </button>
                  </div>
                  <RecordList
                    empty="Aucun niveau cree."
                    items={levels.map((level) => ({
                      id: level.id,
                      title: level.name,
                      detail: level.code ? `Code : ${level.code}` : `Ordre : ${level.orderIndex}`
                    }))}
                  />
                </form>
                ) : null}

                {structureTab === "subjects" ? (
                <form className="settings-block" onSubmit={handleCreateSubject}>
                  <div className="section-title">
                    <strong>Matieres</strong>
                    <span>Catalogue de l'etablissement</span>
                  </div>
                  <div className="setup-form">
                    <label className="field full">
                      <span className="required">Nom de la matiere</span>
                      <input
                        disabled={!selected}
                        required
                        placeholder="Exemple : Mathematiques"
                        value={subjectForm.name}
                        onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Code</span>
                      <input
                        disabled={!selected}
                        placeholder="Exemple : MATH"
                        value={subjectForm.code}
                        onChange={(event) => setSubjectForm({ ...subjectForm, code: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Groupe</span>
                      <input
                        disabled={!selected}
                        placeholder="Exemple : Scientifique"
                        value={subjectForm.subjectGroup}
                        onChange={(event) =>
                          setSubjectForm({ ...subjectForm, subjectGroup: event.target.value })
                        }
                      />
                    </label>
                    <button className="primary-button field full" disabled={!selected || structureSaving} type="submit">
                      {structureSaving ? <Loader2 size={17} /> : <Plus size={17} />}
                      Ajouter la matiere
                    </button>
                  </div>
                  <RecordList
                    empty="Aucune matiere creee."
                    items={subjects.map((subject) => ({
                      id: subject.id,
                      title: subject.name,
                      detail: subject.subjectGroup || subject.code || "Sans groupe"
                    }))}
                  />
                </form>
                ) : null}

                {structureTab === "classes" ? (
                <form className="settings-block" onSubmit={handleCreateClass}>
                  <div className="section-title">
                    <strong>Classes</strong>
                    <span>{activeYear ? `Annee : ${activeYear.name}` : "Annee active requise"}</span>
                  </div>
                  <div className="setup-form">
                    <label className="field full">
                      <span className="required">Nom de la classe</span>
                      <input
                        disabled={!selected || !activeYear}
                        required
                        placeholder="Exemple : 6eme A"
                        value={classForm.name}
                        onChange={(event) => setClassForm({ ...classForm, name: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Niveau</span>
                      <select
                        disabled={!selected || !activeYear}
                        value={classForm.levelId}
                        onChange={(event) => setClassForm({ ...classForm, levelId: event.target.value })}
                      >
                        <option value="">Aucun niveau</option>
                        {levels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Code</span>
                      <input
                        disabled={!selected || !activeYear}
                        placeholder="Exemple : 6A"
                        value={classForm.code}
                        onChange={(event) => setClassForm({ ...classForm, code: event.target.value })}
                      />
                    </label>
                    <label className="field full">
                      <span>Capacite</span>
                      <input
                        disabled={!selected || !activeYear}
                        min={1}
                        placeholder="Exemple : 60"
                        type="number"
                        value={classForm.capacity}
                        onChange={(event) => setClassForm({ ...classForm, capacity: event.target.value })}
                      />
                    </label>
                    <label className="field full checkbox-field">
                      <input
                        checked={classForm.tuitionEnabled}
                        disabled={!selected || !activeYear}
                        type="checkbox"
                        onChange={(event) =>
                          setClassForm({ ...classForm, tuitionEnabled: event.target.checked })
                        }
                      />
                      <span>Ajouter la scolarite et les tranches de cette classe maintenant</span>
                    </label>
                    {classForm.tuitionEnabled ? (
                      <div className="class-fee-builder field full">
                        <div className="section-title compact">
                          <strong>Scolarite de la classe</strong>
                          <span>Tranches creees avec la classe</span>
                        </div>
                        {classForm.tuitionTranches.map((tranche, index) => (
                          <div className="class-fee-row" key={index}>
                            <label className="field">
                              <span>Libelle</span>
                              <input
                                placeholder="Exemple : Scolarite - tranche 1"
                                value={tranche.name}
                                onChange={(event) => {
                                  const next = [...classForm.tuitionTranches];
                                  next[index] = { ...tranche, name: event.target.value };
                                  setClassForm({ ...classForm, tuitionTranches: next });
                                }}
                              />
                            </label>
                            <label className="field">
                              <span>Montant</span>
                              <input
                                min={1}
                                step={1}
                                type="number"
                                placeholder="25000"
                                value={tranche.amount}
                                onChange={(event) => {
                                  const next = [...classForm.tuitionTranches];
                                  next[index] = { ...tranche, amount: event.target.value };
                                  setClassForm({ ...classForm, tuitionTranches: next });
                                }}
                              />
                            </label>
                            <label className="field">
                              <span>Echeance</span>
                              <input
                                type="date"
                                value={tranche.dueDate}
                                onChange={(event) => {
                                  const next = [...classForm.tuitionTranches];
                                  next[index] = { ...tranche, dueDate: event.target.value };
                                  setClassForm({ ...classForm, tuitionTranches: next });
                                }}
                              />
                            </label>
                          </div>
                        ))}
                        <button
                          className="ghost-button small"
                          type="button"
                          onClick={() =>
                            setClassForm({
                              ...classForm,
                              tuitionTranches: [
                                ...classForm.tuitionTranches,
                                {
                                  name: `Scolarite - tranche ${classForm.tuitionTranches.length + 1}`,
                                  amount: "",
                                  dueDate: ""
                                }
                              ]
                            })
                          }
                        >
                          <Plus size={15} />
                          Ajouter une tranche
                        </button>
                      </div>
                    ) : null}
                    <button className="primary-button field full" disabled={!selected || !activeYear || structureSaving} type="submit">
                      {structureSaving ? <Loader2 size={17} /> : <Plus size={17} />}
                      Ajouter la classe
                    </button>
                  </div>
                  <RecordList
                    empty="Aucune classe creee."
                    items={classes.map((schoolClass) => ({
                      id: schoolClass.id,
                      title: schoolClass.name,
                      detail: `${schoolClass.level?.name ?? "Sans niveau"} - ${schoolClass.classSubjects?.length ?? 0} matiere(s)`
                    }))}
                  />
                </form>
                ) : null}

                {structureTab === "coefficients" ? (
                <form className="settings-block" onSubmit={handleAssignSubject}>
                  <div className="section-title">
                    <strong>Coefficients</strong>
                    <span>Affecter une matiere a une classe</span>
                  </div>
                  <div className="setup-form">
                    <label className="field full">
                      <span className="required">Classe</span>
                      <select
                        disabled={!selected || !classes.length}
                        required
                        value={assignForm.classId}
                        onChange={(event) => setAssignForm({ ...assignForm, classId: event.target.value })}
                      >
                        <option value="">Choisir une classe</option>
                        {classes.map((schoolClass) => (
                          <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span className="required">Matiere</span>
                      <select
                        disabled={!selected || !subjects.length}
                        required
                        value={assignForm.subjectId}
                        onChange={(event) => setAssignForm({ ...assignForm, subjectId: event.target.value })}
                      >
                        <option value="">Choisir une matiere</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span className="required">Coefficient</span>
                      <input
                        disabled={!selected}
                        min={0}
                        required
                        step="0.25"
                        type="number"
                        value={assignForm.coefficient}
                        onChange={(event) =>
                          setAssignForm({ ...assignForm, coefficient: event.target.value })
                        }
                      />
                    </label>
                    <button className="primary-button field full" disabled={!selected || structureSaving} type="submit">
                      {structureSaving ? <Loader2 size={17} /> : <Plus size={17} />}
                      Affecter
                    </button>
                  </div>
                </form>
                ) : null}
              </div>
            </div>
            ) : null}

            {activeView === "students" ? (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Eleves</h2>
                  <span>Inscription dans une classe active</span>
                </div>
                <GraduationCap size={20} />
              </div>

              {alerts.length ? (
                <div className="inline-alerts">
                  {alerts.map((alert) => (
                    <div className="alert-item" key={alert}>
                      <AlertTriangle size={18} />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="student-workspace">
                <form className="settings-block student-enrollment-form" onSubmit={handleCreateStudent}>
                  <div className="section-title">
                    <strong>Nouvelle inscription</strong>
                    <span>{activeYear ? `Annee : ${activeYear.name}` : "Classe requise"}</span>
                  </div>
                  <div className="setup-form">
                    <label className="field full">
                      <span>Matricule genere</span>
                      <input
                        readOnly
                        value={previewStudentMatricule(selected, activeYear)}
                      />
                      <small>Genere automatiquement selon le format de l'etablissement.</small>
                    </label>
                    <label className="field">
                      <span className="required">Prenom</span>
                      <input
                        disabled={!selected || studentSaving}
                        required
                        minLength={2}
                        placeholder="Exemple : Aminata"
                        value={studentForm.firstName}
                        onChange={(event) =>
                          setStudentForm({ ...studentForm, firstName: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="required">Nom</span>
                      <input
                        disabled={!selected || studentSaving}
                        required
                        minLength={2}
                        placeholder="Exemple : Ouedraogo"
                        value={studentForm.lastName}
                        onChange={(event) =>
                          setStudentForm({ ...studentForm, lastName: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Sexe</span>
                      <select
                        disabled={!selected || studentSaving}
                        value={studentForm.gender}
                        onChange={(event) =>
                          setStudentForm({ ...studentForm, gender: event.target.value })
                        }
                      >
                        <option value="">Non renseigne</option>
                        <option value="FEMALE">Fille</option>
                        <option value="MALE">Garcon</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Date de naissance</span>
                      <input
                        disabled={!selected || studentSaving}
                        type="date"
                        value={studentForm.birthDate}
                        onChange={(event) =>
                          setStudentForm({ ...studentForm, birthDate: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Lieu de naissance</span>
                      <input
                        disabled={!selected || studentSaving}
                        placeholder="Exemple : Bobo-Dioulasso"
                        value={studentForm.birthPlace}
                        onChange={(event) =>
                          setStudentForm({ ...studentForm, birthPlace: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Nationalite</span>
                      <input
                        disabled={!selected || studentSaving}
                        placeholder="Exemple : Burkinabe"
                        value={studentForm.nationality}
                        onChange={(event) =>
                          setStudentForm({ ...studentForm, nationality: event.target.value })
                        }
                      />
                    </label>
                    <label className="field full">
                      <span className="required">Classe</span>
                      <select
                        disabled={!selected || !activeClasses.length || studentSaving}
                        required
                        value={studentForm.classId}
                        onChange={(event) =>
                          setStudentForm({ ...studentForm, classId: event.target.value })
                        }
                      >
                        <option value="">
                          {activeClasses.length ? "Choisir une classe" : "Creer une classe d'abord"}
                        </option>
                        {activeClasses.map((schoolClass) => (
                          <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span className="required">Type d'inscription</span>
                      <select
                        disabled={!selected || studentSaving}
                        value={studentForm.enrollmentType}
                        onChange={(event) =>
                          setStudentForm({
                            ...studentForm,
                            enrollmentType: event.target.value as "NEW" | "REENROLLMENT" | "TRANSFER"
                          })
                        }
                      >
                        <option value="NEW">Nouvelle inscription</option>
                        <option value="REENROLLMENT">Reinscription</option>
                        <option value="TRANSFER">Transfert</option>
                      </select>
                    </label>
                    <GuardianFields
                      disabled={!selected || studentSaving}
                      required
                      subtitle="Contact appele en priorite"
                      title="Responsable principal"
                      value={studentForm.primaryGuardian}
                      onChange={(guardian) =>
                        setStudentForm({ ...studentForm, primaryGuardian: guardian })
                      }
                    />
                    <GuardianFields
                      disabled={!selected || studentSaving}
                      subtitle="Optionnel, utile en cas d'urgence"
                      title="Contact secondaire"
                      value={studentForm.secondaryGuardian}
                      onChange={(guardian) =>
                        setStudentForm({ ...studentForm, secondaryGuardian: guardian })
                      }
                    />
                    <button className="primary-button field full" disabled={!selected || studentSaving} type="submit">
                      {studentSaving ? <Loader2 size={17} /> : <Plus size={17} />}
                      Inscrire l'eleve
                    </button>
                  </div>
                </form>

                <div className="settings-block student-records-panel">
                  <div className="section-title">
                    <strong>Liste des eleves</strong>
                    <span>{filteredStudents.length} dossier(s)</span>
                  </div>
                  <div className="student-list-tools">
                    <label className="field">
                      <span>Recherche</span>
                      <input
                        list="student-search-suggestions"
                        placeholder="Nom, matricule, parent"
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                      />
                      <datalist id="student-search-suggestions">
                        {students.map((student) => (
                          <option
                            key={student.id}
                            value={`${student.matricule} - ${student.lastName} ${student.firstName}`}
                          />
                        ))}
                      </datalist>
                    </label>
                    <label className="field">
                      <span>Classe</span>
                      <select
                        value={studentClassFilter}
                        onChange={(event) => setStudentClassFilter(event.target.value)}
                      >
                        <option value="">Toutes les classes</option>
                        {activeClasses.map((schoolClass) => (
                          <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="student-table-wrap">
                    {filteredStudents.length ? (
                      <table className="student-table">
                        <thead>
                          <tr>
                            <th>Matricule</th>
                            <th>Eleve</th>
                            <th>Classe</th>
                            <th>Responsable</th>
                            <th>Docs</th>
                            <th>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((student) => {
                            const enrollment = student.enrollments?.[0];
                            const primaryGuardian =
                              student.guardians?.find((item) => item.isPrimary) ?? student.guardians?.[0];
                            return (
                              <tr key={student.id}>
                                <td>
                                  <strong>{student.matricule}</strong>
                                </td>
                                <td>
                                  <strong>{student.lastName} {student.firstName}</strong>
                                  <span>{student.gender === "FEMALE" ? "Fille" : student.gender === "MALE" ? "Garcon" : "Sexe non renseigne"}</span>
                                </td>
                                <td>{enrollment?.class?.name ?? "Aucune classe"}</td>
                                <td>
                                  {primaryGuardian ? (
                                    <>
                                      <strong>
                                        {primaryGuardian.guardian.firstName} {primaryGuardian.guardian.lastName}
                                      </strong>
                                      <span>
                                        {primaryGuardian.relationship} - {primaryGuardian.guardian.phone}
                                      </span>
                                    </>
                                  ) : (
                                    <span>Aucun contact</span>
                                  )}
                                </td>
                                <td>{student.documents?.length ?? 0}</td>
                                <td>
                                  <span className="status-badge active">
                                    {student.status === "ACTIVE" ? "Actif" : student.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-state compact">Aucun eleve trouve.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ) : null}

            {activeView === "documents" ? (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Documents administratifs</h2>
                  <span>Pieces scannees, visualisation et impression</span>
                </div>
                <FileText size={20} />
              </div>

              {alerts.length ? (
                <div className="inline-alerts">
                  {alerts.map((alert) => (
                    <div className="alert-item" key={alert}>
                      <AlertTriangle size={18} />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="document-workspace">
                <div className="settings-block document-student-picker">
                  <div className="section-title">
                    <strong>Dossiers eleves</strong>
                    <span>{filteredStudents.length} resultat(s)</span>
                  </div>
                  <div className="student-list-tools">
                    <label className="field">
                      <span>Recherche</span>
                      <input
                        list="student-document-search-suggestions"
                        placeholder="Nom, matricule, parent"
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                      />
                      <datalist id="student-document-search-suggestions">
                        {students.map((student) => (
                          <option
                            key={student.id}
                            value={`${student.matricule} - ${student.lastName} ${student.firstName}`}
                          />
                        ))}
                      </datalist>
                    </label>
                    <label className="field">
                      <span>Classe</span>
                      <select
                        value={studentClassFilter}
                        onChange={(event) => setStudentClassFilter(event.target.value)}
                      >
                        <option value="">Toutes les classes</option>
                        {activeClasses.map((schoolClass) => (
                          <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="student-table-wrap document-student-table">
                    {filteredStudents.length ? (
                      <table className="student-table clickable">
                        <thead>
                          <tr>
                            <th>Matricule</th>
                            <th>Eleve</th>
                            <th>Classe</th>
                            <th>Docs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((student) => {
                            const enrollment = student.enrollments?.[0];
                            return (
                              <tr
                                className={selectedDocumentStudentId === student.id ? "selected" : ""}
                                key={student.id}
                                onClick={() => setSelectedDocumentStudentId(student.id)}
                              >
                                <td>
                                  <strong>{student.matricule}</strong>
                                </td>
                                <td>
                                  <strong>
                                    {student.lastName} {student.firstName}
                                  </strong>
                                  <span>
                                    {student.gender === "FEMALE"
                                      ? "Fille"
                                      : student.gender === "MALE"
                                        ? "Garcon"
                                        : "Sexe non renseigne"}
                                  </span>
                                </td>
                                <td>{enrollment?.class?.name ?? "Aucune classe"}</td>
                                <td>{student.documents?.length ?? 0}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-state compact">Aucun eleve trouve.</div>
                    )}
                  </div>
                </div>

                <div className="settings-block document-management-panel">
                  <div className="document-panel standalone">
                    <div className="section-title">
                      <strong>Pieces du dossier</strong>
                      <span>
                        {selectedDocumentStudent
                          ? `${selectedDocumentStudent.lastName} ${selectedDocumentStudent.firstName}`
                          : "Selectionner un eleve"}
                      </span>
                    </div>
                    <form className="setup-form" onSubmit={handleUploadStudentDocument}>
                      <div className="selected-student-card field full">
                        {selectedDocumentStudent ? (
                          <div>
                            <span>Eleve selectionne</span>
                            <strong>
                              {selectedDocumentStudent.matricule} - {selectedDocumentStudent.lastName}{" "}
                              {selectedDocumentStudent.firstName}
                            </strong>
                            <small>Clique une ligne dans la table pour changer de dossier.</small>
                          </div>
                        ) : (
                          <div>
                            <span>Aucun eleve selectionne</span>
                            <strong>Recherche puis clique une ligne dans la table.</strong>
                          </div>
                        )}
                      </div>
                      <label className="field">
                        <span className="required">Type</span>
                        <select
                          disabled={!selectedDocumentStudent || documentSaving}
                          required
                          value={documentForm.documentType}
                          onChange={(event) =>
                            setDocumentForm({ ...documentForm, documentType: event.target.value })
                          }
                        >
                          {documentTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Libelle</span>
                        <input
                          disabled={!selectedDocumentStudent || documentSaving}
                          placeholder="Exemple : acte scanne original"
                          value={documentForm.label}
                          onChange={(event) =>
                            setDocumentForm({ ...documentForm, label: event.target.value })
                          }
                        />
                      </label>
                      <label className="field full">
                        <span className="required">Fichier scanne</span>
                        <input
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          disabled={!selectedDocumentStudent || documentSaving}
                          required
                          type="file"
                          onChange={(event) =>
                            setDocumentForm({
                              ...documentForm,
                              file: event.target.files?.[0] ?? null
                            })
                          }
                        />
                        <small>PDF, JPG, PNG ou WEBP. Maximum 8 Mo.</small>
                      </label>
                      <button
                        className="primary-button field full"
                        disabled={!selectedDocumentStudent || documentSaving}
                        type="submit"
                      >
                        {documentSaving ? <Loader2 size={17} /> : <CloudUpload size={17} />}
                        Ajouter le document
                      </button>
                    </form>
                    <div className="document-list">
                      {studentDocuments.length ? (
                        studentDocuments.map((studentDocument) => (
                          <div className="document-row" key={studentDocument.id}>
                            <div className="document-main">
                              <strong>{documentTypeLabel(studentDocument.documentType)}</strong>
                              <span>{documentDisplayName(studentDocument)}</span>
                              <small>
                                {formatFileSize(studentDocument.sizeBytes)} -{" "}
                                {new Date(studentDocument.createdAt).toLocaleDateString("fr-FR")}
                              </small>
                            </div>
                            <div className="document-actions">
                              <a
                                className="document-action-button"
                                href={currentStudentDocumentFileUrl(studentDocument)}
                                target="_blank"
                                rel="noreferrer"
                                title="Visualiser"
                              >
                                <Eye size={16} />
                              </a>
                              <button
                                className="document-action-button"
                                type="button"
                                title="Imprimer"
                                onClick={() => handlePrintStudentDocument(studentDocument)}
                              >
                                <Printer size={16} />
                              </button>
                              <a
                                className="document-action-button"
                                href={currentStudentDocumentFileUrl(studentDocument, true)}
                                target="_blank"
                                rel="noreferrer"
                                title="Telecharger"
                              >
                                <Download size={16} />
                              </a>
                              <button
                                className="document-action-button danger"
                                disabled={documentActionId === studentDocument.id}
                                type="button"
                                title="Supprimer"
                                onClick={() => void handleDeleteStudentDocument(studentDocument)}
                              >
                                {documentActionId === studentDocument.id ? (
                                  <Loader2 size={16} />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state compact">Aucun document pour cet eleve.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ) : null}

            {activeView === "payments" ? (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Paiements</h2>
                  <span>{paymentOverview?.academicYear.name ?? activeYear?.name ?? "Annee active requise"}</span>
                </div>
                <ReceiptText size={20} />
              </div>

              {alerts.length ? (
                <div className="inline-alerts">
                  {alerts.map((alert) => (
                    <div className="alert-item" key={alert}>
                      <AlertTriangle size={18} />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {paymentOverview ? (
                <>
                  <div className="finance-summary-grid">
                    <div className="finance-summary-card">
                      <span>Attendu</span>
                      <strong>{formatMoney(paymentOverview.totals.expected, paymentOverview.establishment.currency)}</strong>
                    </div>
                    <div className="finance-summary-card">
                      <span>Encaisse</span>
                      <strong>{formatMoney(paymentOverview.totals.paid, paymentOverview.establishment.currency)}</strong>
                    </div>
                    <div className="finance-summary-card">
                      <span>Reste</span>
                      <strong>{formatMoney(paymentOverview.totals.balance, paymentOverview.establishment.currency)}</strong>
                    </div>
                  </div>
                  {paymentOverview.alerts.length ? (
                    <div className="finance-alert-grid">
                      {paymentOverview.alerts.map((alert) => (
                        <div className="finance-alert" key={alert}>
                          <AlertTriangle size={17} />
                          <span>{alert}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {paymentTab === "fees" ? (
                    <div className="finance-grid">
                      <form className="settings-block" onSubmit={handleCreateFeeItem}>
                        <div className="section-title">
                          <strong>Frais et tranches</strong>
                          <span>{paymentOverview.feeItems.length} frais cree(s)</span>
                        </div>
                        <div className="setup-form">
                          <label className="field full">
                            <span className="required">Libelle</span>
                            <input
                              required
                              minLength={2}
                              placeholder="Exemple : Scolarite - tranche 1"
                              value={feeForm.name}
                              onChange={(event) => setFeeForm({ ...feeForm, name: event.target.value })}
                            />
                          </label>
                          <label className="field">
                            <span className="required">Montant</span>
                            <input
                              required
                              min={1}
                              step={1}
                              type="number"
                              placeholder="Exemple : 25000"
                              value={feeForm.amount}
                              onChange={(event) => setFeeForm({ ...feeForm, amount: event.target.value })}
                            />
                          </label>
                          <label className="field">
                            <span>Echeance</span>
                            <input
                              type="date"
                              value={feeForm.dueDate}
                              onChange={(event) => setFeeForm({ ...feeForm, dueDate: event.target.value })}
                            />
                          </label>
                          <label className="field full">
                            <span>Classe concernee</span>
                            <select
                              value={feeForm.classId}
                              onChange={(event) => setFeeForm({ ...feeForm, classId: event.target.value })}
                            >
                              <option value="">Toutes les classes actives</option>
                              {activeClasses.map((schoolClass) => (
                                <option key={schoolClass.id} value={schoolClass.id}>
                                  {schoolClass.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button className="primary-button field full" disabled={paymentSaving} type="submit">
                            {paymentSaving ? <Loader2 size={17} /> : <Plus size={17} />}
                            Creer le frais
                          </button>
                        </div>
                      </form>

                      <div className="settings-block">
                        <div className="section-title">
                          <strong>Catalogue des frais</strong>
                          <span>Affectation controlee</span>
                        </div>
                        <div className="finance-list">
                          {paymentOverview.feeItems.length ? (
                            paymentOverview.feeItems.map((feeItem) => (
                              <div className="finance-row" key={feeItem.id}>
                                {editingFeeItemId === feeItem.id ? (
                                  <div className="fee-edit-form">
                                    <label className="field">
                                      <span>Libelle</span>
                                      <input
                                        value={feeEditForm.name}
                                        onChange={(event) =>
                                          setFeeEditForm({ ...feeEditForm, name: event.target.value })
                                        }
                                      />
                                    </label>
                                    <label className="field">
                                      <span>Montant</span>
                                      <input
                                        min={1}
                                        step={1}
                                        type="number"
                                        value={feeEditForm.amount}
                                        onChange={(event) =>
                                          setFeeEditForm({ ...feeEditForm, amount: event.target.value })
                                        }
                                      />
                                    </label>
                                    <label className="field">
                                      <span>Echeance</span>
                                      <input
                                        type="date"
                                        value={feeEditForm.dueDate}
                                        onChange={(event) =>
                                          setFeeEditForm({ ...feeEditForm, dueDate: event.target.value })
                                        }
                                      />
                                    </label>
                                    <label className="field">
                                      <span>Classe</span>
                                      <select
                                        value={feeEditForm.classId}
                                        onChange={(event) =>
                                          setFeeEditForm({ ...feeEditForm, classId: event.target.value })
                                        }
                                      >
                                        <option value="">Toutes classes</option>
                                        {activeClasses.map((schoolClass) => (
                                          <option key={schoolClass.id} value={schoolClass.id}>
                                            {schoolClass.name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <div className="fee-action-row">
                                      <button
                                        className="primary-button"
                                        disabled={paymentSaving}
                                        type="button"
                                        onClick={() => void handleUpdateFeeItem(feeItem.id)}
                                      >
                                        <Save size={15} />
                                        Enregistrer
                                      </button>
                                      <button
                                        className="ghost-button"
                                        type="button"
                                        onClick={() => setEditingFeeItemId("")}
                                      >
                                        Annuler
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <strong>{feeItem.name}</strong>
                                      <span>
                                        {formatMoney(feeItem.amount, paymentOverview.establishment.currency)} -{" "}
                                        {feeItem.class?.name ?? "Toutes classes"} - {feeItem.assignmentsCount} eleve(s)
                                      </span>
                                      <span>
                                        Paye : {formatMoney(feeItem.paidAmount, paymentOverview.establishment.currency)}
                                      </span>
                                    </div>
                                    <div className="fee-action-row">
                                      <button
                                        className="ghost-button small"
                                        disabled={paymentSaving}
                                        type="button"
                                        onClick={() => void handleAssignFeeItem(feeItem.id, feeItem.classId)}
                                      >
                                        Affecter
                                      </button>
                                      <button
                                        className="ghost-button small"
                                        disabled={paymentSaving}
                                        type="button"
                                        onClick={() => startEditFeeItem(feeItem)}
                                      >
                                        Modifier
                                      </button>
                                      <button
                                        className="ghost-button small danger-button"
                                        disabled={paymentSaving || feeItem.paidAmount > 0}
                                        type="button"
                                        title={
                                          feeItem.paidAmount > 0
                                            ? "Suppression impossible : paiement deja encaisse"
                                            : "Supprimer"
                                        }
                                        onClick={() => void handleDeleteFeeItem(feeItem.id)}
                                      >
                                        Supprimer
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="empty-state compact">Aucun frais cree.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {paymentTab === "collect" ? (
                    <div className="payment-workspace">
                      <div className="settings-block">
                        <div className="section-title">
                          <strong>Eleves a encaisser</strong>
                          <span>{paymentOverview.students.length} dossier(s)</span>
                        </div>
                        <div className="student-table-wrap payment-student-table">
                          {paymentOverview.students.length ? (
                            <table className="student-table clickable">
                              <thead>
                                <tr>
                                  <th>Matricule</th>
                                  <th>Eleve</th>
                                  <th>Classe</th>
                                  <th>Reste</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paymentOverview.students.map((student) => (
                                  <tr
                                    className={selectedPaymentStudentId === student.id ? "selected" : ""}
                                    key={student.id}
                                    onClick={() => setSelectedPaymentStudentId(student.id)}
                                  >
                                    <td>
                                      <strong>{student.matricule}</strong>
                                    </td>
                                    <td>
                                      <strong>
                                        {student.lastName} {student.firstName}
                                      </strong>
                                      <span>{student.guardianPhone ?? "Aucun contact"}</span>
                                    </td>
                                    <td>{student.className ?? "Aucune classe"}</td>
                                    <td>{formatMoney(student.balance, paymentOverview.establishment.currency)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="empty-state compact">Aucun eleve actif pour cette annee.</div>
                          )}
                        </div>
                      </div>

                      <form className="settings-block" onSubmit={handleCollectPayment}>
                        <div className="section-title">
                          <strong>Encaissement</strong>
                          <span>{selectedPaymentStudent ? selectedPaymentStudent.matricule : "Selectionner un eleve"}</span>
                        </div>
                        {selectedPaymentStudent ? (
                          <div className="payment-student-card">
                            <strong>
                              {selectedPaymentStudent.lastName} {selectedPaymentStudent.firstName}
                            </strong>
                            <span>{selectedPaymentStudent.className ?? "Aucune classe"}</span>
                            <div>
                              <small>Du : {formatMoney(selectedPaymentStudent.totalDue, paymentOverview.establishment.currency)}</small>
                              <small>Paye : {formatMoney(selectedPaymentStudent.paid, paymentOverview.establishment.currency)}</small>
                              <small>Reste : {formatMoney(selectedPaymentStudent.balance, paymentOverview.establishment.currency)}</small>
                            </div>
                          </div>
                        ) : (
                          <div className="empty-state compact">Selectionner un eleve.</div>
                        )}
                        <div className="payment-assignment-list">
                          {selectedPaymentStudent?.assignments.length ? (
                            selectedPaymentStudent.assignments.map((assignment) => (
                              <div className="payment-assignment-row" key={assignment.id}>
                                <div>
                                  <span>{assignment.feeName}</span>
                                  <small>
                                    Du : {formatMoney(assignment.amountDue, paymentOverview.establishment.currency)} -{" "}
                                    Paye : {formatMoney(assignment.paid, paymentOverview.establishment.currency)}
                                  </small>
                                </div>
                                <strong>
                                  Reste {formatMoney(assignment.balance, paymentOverview.establishment.currency)}
                                </strong>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state compact">Aucun frais affecte.</div>
                          )}
                        </div>
                        <div className="setup-form">
                          <label className="field">
                            <span className="required">Montant encaisse</span>
                            <input
                              disabled={!selectedPaymentStudent || paymentSaving}
                              min={1}
                              required
                              step={1}
                              type="number"
                              value={paymentForm.amount}
                              onChange={(event) =>
                                setPaymentForm({ ...paymentForm, amount: event.target.value })
                              }
                            />
                          </label>
                          <label className="field">
                            <span className="required">Methode</span>
                            <select
                              disabled={!selectedPaymentStudent || paymentSaving}
                              value={paymentForm.method}
                              onChange={(event) =>
                                setPaymentForm({
                                  ...paymentForm,
                                  method: event.target.value as typeof paymentForm.method
                                })
                              }
                            >
                              <option value="CASH">Especes</option>
                              <option value="MOBILE_MONEY">Mobile money</option>
                              <option value="BANK_TRANSFER">Virement</option>
                              <option value="CHECK">Cheque</option>
                              <option value="OTHER">Autre</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Reference</span>
                            <input
                              disabled={!selectedPaymentStudent || paymentSaving}
                              placeholder="Exemple : transaction mobile"
                              value={paymentForm.reference}
                              onChange={(event) =>
                                setPaymentForm({ ...paymentForm, reference: event.target.value })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Recu par</span>
                            <input
                              disabled={!selectedPaymentStudent || paymentSaving}
                              placeholder="Exemple : Comptable"
                              value={paymentForm.receivedBy}
                              onChange={(event) =>
                                setPaymentForm({ ...paymentForm, receivedBy: event.target.value })
                              }
                            />
                          </label>
                          <button
                            className="primary-button field full"
                            disabled={!selectedPaymentStudent || paymentSaving || !selectedPaymentStudent.balance}
                            type="submit"
                          >
                            {paymentSaving ? <Loader2 size={17} /> : <ReceiptText size={17} />}
                            Enregistrer le paiement
                          </button>
                        </div>
                        {lastReceipt ? (
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() => printPaymentReceipt(lastReceipt)}
                          >
                            <Printer size={17} />
                            Imprimer le dernier recu
                          </button>
                        ) : null}
                      </form>
                    </div>
                  ) : null}

                  {paymentTab === "receipts" ? (
                    <div className="settings-block">
                      <div className="section-title">
                        <strong>Recus recents</strong>
                        <span>{paymentOverview.recentPayments.length} paiement(s)</span>
                      </div>
                      <div className="finance-list">
                        {paymentOverview.recentPayments.length ? (
                          paymentOverview.recentPayments.map((payment) => (
                            <div className="finance-row" key={payment.id}>
                              <div>
                                <strong>{payment.receiptNumber}</strong>
                                <span>
                                  {payment.student?.lastName} {payment.student?.firstName} -{" "}
                                  {formatMoney(payment.amount, paymentOverview.establishment.currency)} -{" "}
                                  {new Date(payment.paidAt).toLocaleDateString("fr-FR")}
                                </span>
                              </div>
                              <button
                                className="ghost-button small"
                                type="button"
                                onClick={() => printPaymentReceipt(payment)}
                              >
                                <Printer size={15} />
                                Imprimer
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state compact">Aucun paiement enregistre.</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="empty-state">Aucune donnee de paiement chargee.</div>
              )}
            </div>
            ) : null}

            {activeView === "dashboard" ? (
            <>
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Vue eleves</h2>
                  <span>Repartition et suivi rapide</span>
                </div>
                <GraduationCap size={20} />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <div className="section-title">
                    <strong>Par classe</strong>
                    <span>{students.length} eleve(s)</span>
                  </div>
                  <div className="bar-list">
                    {studentClassStats.length ? (
                      studentClassStats.map((item) => (
                        <div className="bar-row" key={item.id}>
                          <div className="bar-row-head">
                            <strong>{item.name}</strong>
                            <span>{item.capacity ? `${item.count}/${item.capacity}` : item.count}</span>
                          </div>
                          <div className="bar-track">
                            <span
                              className="bar-fill"
                              style={{
                                width: item.count
                                  ? `${Math.max(5, Math.round((item.count / maxClassStudentCount) * 100))}%`
                                  : "0%"
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state compact">Aucune classe active.</div>
                    )}
                  </div>
                </div>
                <div className="chart-card">
                  <div className="section-title">
                    <strong>Par sexe</strong>
                    <span>Dossiers eleves</span>
                  </div>
                  <div className="bar-list">
                    {genderStats.map((item) => (
                      <div className="bar-row" key={item.label}>
                        <div className="bar-row-head">
                          <strong>{item.label}</strong>
                          <span>{item.value}</span>
                        </div>
                        <div className="bar-track">
                          <span
                            className="bar-fill muted"
                            style={{
                              width: item.value
                                ? `${Math.max(5, Math.round((item.value / maxGenderCount) * 100))}%`
                                : "0%"
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Modules MVP</h2>
                  <span>{selected?.licenses?.[0]?.status ?? "TRIAL"}</span>
                </div>
                <button className="ghost-button" type="button" title="Actualiser" onClick={() => void loadEstablishments()}>
                  <CheckCircle2 size={17} />
                  Actualiser
                </button>
              </div>
              <div className="module-grid">
                {moduleCards.map(([title, detail]) => (
                  <div className="module-card" key={title}>
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Cycle de demarrage</h2>
                  <span>Socle MVP</span>
                </div>
              </div>
              <div className="timeline">
                <TimelineItem icon={Building2} title="Etablissement" detail="Identite, licence, modules actifs" />
                <TimelineItem icon={CalendarDays} title="Annee scolaire" detail="Periodes, classes, inscriptions" />
                <TimelineItem icon={Banknote} title="Caisse" detail="Tranches, recus, situation financiere" />
                <TimelineItem icon={BookOpen} title="Bulletins" detail="Notes, moyennes, PDF, verrouillage" />
              </div>
            </div>
            </>
            ) : null}

            {activeView !== "dashboard" &&
            activeView !== "settings" &&
            activeView !== "structure" &&
            activeView !== "students" &&
            activeView !== "documents" &&
            activeView !== "payments" ? (
              <ComingSoonView view={activeView} />
            ) : null}
          </section>

          {activeView === "dashboard" ? (
          <aside>
            {establishments.length === 0 ? (
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Nouvel etablissement</h2>
                    <span>Amorcage du compte</span>
                  </div>
                </div>
                <form className="setup-form" onSubmit={handleCreate}>
                  <label className="field full">
                    <span className="required">Nom</span>
                    <input
                      required
                      minLength={2}
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="Exemple : Lycee Wend-Panga"
                    />
                  </label>
                  <label className="field full">
                    <span className="required">Type</span>
                    <select
                      value={form.type}
                      onChange={(event) => setForm({ ...form, type: event.target.value })}
                    >
                      <option value="PRIMARY">Primaire</option>
                      <option value="COLLEGE">College</option>
                      <option value="HIGH_SCHOOL">Lycee</option>
                      <option value="INSTITUTE">Institut</option>
                      <option value="UNIVERSITY">Universite</option>
                      <option value="TRAINING_CENTER">Centre de formation</option>
                    </select>
                  </label>
                  <label className="field full">
                    <span className="required">Ville</span>
                    <input
                      required
                      placeholder="Exemple : Ouagadougou"
                      value={form.city}
                      onChange={(event) => setForm({ ...form, city: event.target.value })}
                    />
                  </label>
                  <label className="field full">
                    <span>Telephone</span>
                    <input
                      inputMode="numeric"
                      maxLength={8}
                      pattern="[0-9]{8}"
                      placeholder="Exemple : 72007342"
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: cleanPhone(event.target.value) })}
                    />
                    <small>8 chiffres exactement si renseigne.</small>
                  </label>
                  <label className="field full">
                    <span>Email</span>
                    <input
                      type="email"
                      pattern="^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$"
                      placeholder="Exemple : contact@ecole.bf"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                    />
                    <small>Exemple valide : contact@ecole.bf.</small>
                  </label>
                  <button className="primary-button field full" disabled={saving} type="submit">
                    {saving ? <Loader2 size={17} /> : <Plus size={17} />}
                    Creer
                  </button>
                </form>
              </div>
            ) : (
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Etablissement actif</h2>
                    <span>Contexte de travail</span>
                  </div>
                  <Building2 size={20} />
                </div>
                <div className="context-list">
                  <div className="context-row">
                    <span>Nom</span>
                    <strong>{selected?.name ?? "Aucun etablissement"}</strong>
                  </div>
                  <div className="context-row">
                    <span>Ville</span>
                    <strong>{selected?.city ?? "Non renseignee"}</strong>
                  </div>
                  <div className="context-row">
                    <span>Annee active</span>
                    <strong>{activeYear?.name ?? "Aucune"}</strong>
                  </div>
                  <div className="context-row">
                    <span>Licence</span>
                    <strong>{selected?.licenses?.[0]?.status ?? "TRIAL"}</strong>
                  </div>
                </div>
                <p className="panel-note">
                  La creation d'un autre etablissement sera reservee a l'admin plateforme.
                </p>
              </div>
            )}

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Alertes</h2>
                  <span>Supervision locale</span>
                </div>
              </div>
              {alerts.length ? (
                <div className="alert-list">
                  {alerts.map((alert) => (
                    <div className="alert-item" key={alert}>
                      <AlertTriangle size={18} />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Aucune alerte active.</div>
              )}
            </div>
          </aside>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function DashboardLoadingShell() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SB</div>
          <div>
            <strong>SchoolSaaS BF</strong>
            <span>Gestion hybride locale</span>
          </div>
        </div>
        <nav className="nav-section" aria-label="Navigation principale">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={`nav-button ${item.view === "dashboard" ? "active" : ""}`}
                    key={item.label}
                    title={item.label}
                    type="button"
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <h1>Administration etablissement</h1>
            <p>Chargement du tableau de bord local</p>
          </div>
          <div className="status-pill">
            <span className="status-dot" />
            Initialisation
          </div>
        </header>
      </section>
    </main>
  );
}

function GuardianFields({
  disabled,
  required = false,
  subtitle,
  title,
  value,
  onChange
}: {
  disabled: boolean;
  required?: boolean;
  subtitle: string;
  title: string;
  value: GuardianForm;
  onChange: (value: GuardianForm) => void;
}) {
  return (
    <>
      <div className="section-title field full">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <label className="field">
        <span className={required ? "required" : undefined}>Lien</span>
        <select
          disabled={disabled}
          required={required}
          value={value.relationship}
          onChange={(event) => onChange({ ...value, relationship: event.target.value })}
        >
          <option value="Pere">Pere</option>
          <option value="Mere">Mere</option>
          <option value="Tuteur">Tuteur</option>
          <option value="Responsable">Responsable</option>
          <option value="Autre">Autre</option>
        </select>
      </label>
      <label className="field">
        <span className={required ? "required" : undefined}>Prenom</span>
        <input
          disabled={disabled}
          minLength={required ? 2 : undefined}
          placeholder="Exemple : Moussa"
          required={required}
          value={value.firstName}
          onChange={(event) => onChange({ ...value, firstName: event.target.value })}
        />
      </label>
      <label className="field">
        <span className={required ? "required" : undefined}>Nom</span>
        <input
          disabled={disabled}
          minLength={required ? 2 : undefined}
          placeholder="Exemple : Ouedraogo"
          required={required}
          value={value.lastName}
          onChange={(event) => onChange({ ...value, lastName: event.target.value })}
        />
      </label>
      <label className="field">
        <span className={required ? "required" : undefined}>Telephone</span>
        <input
          disabled={disabled}
          inputMode="numeric"
          maxLength={8}
          pattern="[0-9]{8}"
          placeholder="Exemple : 72007342"
          required={required}
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: cleanPhone(event.target.value) })}
        />
        <small>8 chiffres exactement.</small>
      </label>
      <label className="field">
        <span>Email</span>
        <input
          disabled={disabled}
          pattern="^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$"
          placeholder="Exemple : parent@ecole.bf"
          type="email"
          value={value.email}
          onChange={(event) => onChange({ ...value, email: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Profession</span>
        <input
          disabled={disabled}
          placeholder="Exemple : Commercant"
          value={value.profession}
          onChange={(event) => onChange({ ...value, profession: event.target.value })}
        />
      </label>
      <label className="field full">
        <span>Adresse</span>
        <input
          disabled={disabled}
          placeholder="Exemple : Secteur 12, Bobo-Dioulasso"
          value={value.address}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
        />
      </label>
    </>
  );
}

function MetricCard({
  label,
  value,
  tone,
  icon: Icon
}: {
  label: string;
  value: number;
  tone: "green" | "teal" | "wine" | "amber";
  icon: typeof GraduationCap;
}) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ComingSoonView({ view }: { view: AppView }) {
  const labels: Record<
    Exclude<
      AppView,
      "dashboard" | "settings" | "structure" | "students" | "documents" | "payments"
    >,
    { title: string; detail: string }
  > = {
    grades: {
      title: "Notes",
      detail: "Saisies, moyennes et bulletins"
    },
    imports: {
      title: "Imports",
      detail: "Import Excel et CSV"
    },
    backups: {
      title: "Sauvegardes",
      detail: "Exports locaux et restauration"
    },
    roles: {
      title: "Roles",
      detail: "Permissions et journal d'activite"
    }
  };

  const content =
    labels[
      view as Exclude<
        AppView,
        "dashboard" | "settings" | "structure" | "students" | "documents" | "payments"
      >
    ];

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>{content.title}</h2>
          <span>{content.detail}</span>
        </div>
      </div>
      <div className="empty-state">
        Ce module est pret dans le menu. On le construira apres la structure scolaire.
      </div>
    </div>
  );
}

function RecordList({
  empty,
  items
}: {
  empty: string;
  items: Array<{ id: string; title: string; detail: string }>;
}) {
  if (!items.length) {
    return <div className="empty-state compact">{empty}</div>;
  }

  return (
    <div className="record-list">
      {items.map((item) => (
        <div className="record-row" key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  title,
  detail
}: {
  icon: typeof Building2;
  title: string;
  detail: string;
}) {
  return (
    <div className="timeline-item">
      <div className="timeline-icon">
        <Icon size={17} />
      </div>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}
