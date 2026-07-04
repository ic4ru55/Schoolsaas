"use client";

import {
  Activity,
  AlertTriangle,
  Banknote,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  Crown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Globe,
  GraduationCap,
  History,
  LayoutDashboard,
  LibraryBig,
  Loader2,
  Lock,
  PlayCircle,
  Plus,
  Power,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  Printer,
  Trash2,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  Users,
  UserPlus,
  Database,
  RefreshCw,
  RotateCcw,
  Search,
  Filter
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AcademicYear,
  activateAcademicYear,
  apiFileUrl,
  assignMainTeacher,
  assignSubjectToClass,
  assignFeeItem,
  collectPayment,
  createAssessment,
  createClass,
  createAcademicYear,
  createEstablishment,
  createFeeItem,
  createGradePeriod,
  createLevel,
  createStudent,
  createSubject,
  createTeacher,
  deleteStudentDocument,
  deleteFeeItem,
  Establishment,
  getClasses,
  getDashboard,
  getEstablishments,
  getGradesOverview,
  getLevels,
  getPaymentsOverview,
  getStudentDossier,
  getStudentDossierByMatricule,
  getStudentDocuments,
  getStudents,
  getSubjects,
  getTeachers,
  Level,
  GradeAssessment,
  GradesOverview,
  SchoolClass,
  Student,
  StudentDossier,
  StudentDocument,
  studentDocumentFileUrl,
  Subject,
  Teacher,
  PaymentRecord,
  PaymentsOverview,
  uploadEstablishmentAsset,
  uploadStudentDocument,
  updateFeeItem,
  updateEstablishment,
  updateStudent,
  updateTeacher,
  saveGrades,
  getReportCard,
  ReportCardData,
  getImportJobs,
  startStudentImport,
  ImportJobRecord,
  getBackups,
  startBackup,
  backupDownloadUrl,
  restoreBackup,
  deleteBackup,
  BackupJob,
  AuthUser,
  getEstablishmentUsers,
  getEstablishmentRoles,
  updateRolePermissions,
  createEstablishmentUser,
  updateEstablishmentUser,
  deleteEstablishmentUser,
  changePassword,

  getPlatformStats,
  updateEstablishmentLicense,
  toggleEstablishmentModule,
  updateEstablishmentStatus,
  getAllAuditLogs,
  getEstablishmentAuditLogs,
  getAuditLogStats,
  AuditLog,
  PaginatedAuditLogs,
  AuditLogStats,
  PlatformStats
} from "../lib/api";

type AppView =
  | "dashboard"
  | "settings"
  | "structure"
  | "students"
  | "documents"
  | "teachers"
  | "payments"
  | "grades"
  | "imports"
  | "backups"
  | "roles"
  | "super-admin"
  | "audit-logs";

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

function emptyStudentForm(classId = "") {
  return {
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    birthPlace: "",
    nationality: "Burkinabe",
    classId,
    enrollmentType: "NEW" as "NEW" | "REENROLLMENT" | "TRANSFER",
    status: "ACTIVE" as Student["status"],
    primaryGuardian: emptyGuardianForm("Pere"),
    secondaryGuardian: emptyGuardianForm("Mere")
  };
}

function emptyClassForm() {
  return {
    name: "",
    code: "",
    capacity: "",
    levelId: "",
    mainTeacherId: "",
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
      { label: "Enseignants", icon: Users, view: "teachers" },
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
      { label: "Roles", icon: ShieldCheck, view: "roles" },
      { label: "Journal d'activite", icon: History, view: "audit-logs" }
    ]
  },
  {
    label: "Super Admin Plateforme",
    items: [
      { label: "Gestion globale", icon: Crown, view: "super-admin" }
    ]
  }
] as const;

const VIEW_MODULES: Partial<Record<AppView, string[]>> = {
  settings: ["establishment", "academic_years"],
  students: ["students", "guardians"],
  documents: ["students"],
  teachers: ["teachers"],
  structure: ["classes", "subjects"],
  payments: ["payments"],
  grades: ["grades"],
  imports: ["imports"],
  backups: ["backups"],
  roles: ["users"],
  "audit-logs": ["users"]
};

function currentLicense(establishment?: Establishment | null) {
  return establishment?.licenses?.[0] ?? null;
}

function licenseStatus(establishment?: Establishment | null) {
  const license = currentLicense(establishment);
  if (!license) {
    return "NO_LICENSE";
  }

  if (
    (license.status === "TRIAL" || license.status === "ACTIVE") &&
    license.expiresAt &&
    new Date(license.expiresAt).getTime() < Date.now()
  ) {
    return "EXPIRED";
  }

  return license.status;
}

function isLicenseBlocked(establishment?: Establishment | null) {
  return ["NO_LICENSE", "EXPIRED", "SUSPENDED"].includes(licenseStatus(establishment));
}

function isModuleEnabled(establishment: Establishment | null, moduleCode: string) {
  return establishment?.modules?.some((module) => module.moduleCode === moduleCode && module.enabled) ?? false;
}

function isViewEnabledForEstablishment(view: AppView, establishment: Establishment | null) {
  if (view === "dashboard" || view === "settings") {
    return true;
  }

  if (isLicenseBlocked(establishment)) {
    return false;
  }

  const modules = VIEW_MODULES[view];
  if (!modules?.length) {
    return true;
  }

  return modules.some((moduleCode) => isModuleEnabled(establishment, moduleCode));
}

function addMonthsInput(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}


const documentTypes = [
  { label: "Acte de naissance", value: "BIRTH_CERTIFICATE" },
  { label: "Photo eleve", value: "PHOTO" },
  { label: "Ancien bulletin", value: "PREVIOUS_REPORT" },
  { label: "Certificat", value: "CERTIFICATE" },
  { label: "Piece du parent", value: "GUARDIAN_ID" },
  { label: "Autre document", value: "OTHER" }
];

const establishmentAssets = [
  {
    title: "Logo",
    assetType: "LOGO",
    field: "logoUrl",
    detail: "Utilise sur les recus, bulletins et documents officiels."
  },
  {
    title: "Cachet",
    assetType: "STAMP",
    field: "stampUrl",
    detail: "Image scannee du cachet pour les sorties imprimees."
  },
  {
    title: "Signature direction",
    assetType: "DIRECTOR_SIGNATURE",
    field: "directorSignatureUrl",
    detail: "Signature de la direction pour bulletins et attestations."
  },
  {
    title: "Signature caisse",
    assetType: "CASHIER_SIGNATURE",
    field: "cashierSignatureUrl",
    detail: "Signature utilisee sur les recus de paiement."
  }
] as const;

type EstablishmentAssetType = (typeof establishmentAssets)[number]["assetType"];

const allowedIdentityImageTypes = ["image/jpeg", "image/png", "image/webp"];

const moduleCards = [
  { title: "Scolarite", detail: "Eleves, parents, classes", codes: ["students", "guardians", "classes"] },
  { title: "Finance", detail: "Tranches, recus, restes", codes: ["payments"] },
  { title: "Pedagogie", detail: "Notes, moyennes, bulletins", codes: ["grades"] },
  { title: "Documents", detail: "PDF imprimables", codes: ["students"] },
  { title: "Imports", detail: "Excel et CSV", codes: ["imports"] },
  { title: "Securite", detail: "Roles et journal", codes: ["users"] }
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

function formatScore(value?: number | null) {
  return value === null || value === undefined
    ? "-"
    : value.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
}

function reportCurrencyLabel(currency?: string | null) {
  if (!currency || currency === "XOF") {
    return "FRANCS CFA";
  }

  return currency;
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

function employmentTypeLabel(value: string) {
  const labels: Record<string, string> = {
    permanent: "Permanent",
    vacataire: "Vacataire",
    contractuel: "Contractuel",
    stagiaire: "Stagiaire"
  };
  return labels[value] ?? value;
}

function teacherStatusLabel(value: string) {
  const labels: Record<string, string> = {
    active: "Actif",
    inactive: "Inactif",
    suspended: "Suspendu"
  };
  return labels[value] ?? value;
}

function studentStatusLabel(value: Student["status"]) {
  const labels: Record<Student["status"], string> = {
    ACTIVE: "Actif",
    TRANSFERRED: "Transfere",
    DROPPED_OUT: "Abandon",
    EXCLUDED: "Exclu",
    GRADUATED: "Diplome"
  };
  return labels[value] ?? value;
}

function studentStatusClass(value: Student["status"]) {
  if (value === "ACTIVE") {
    return "active";
  }

  if (value === "EXCLUDED" || value === "DROPPED_OUT") {
    return "suspended";
  }

  return "inactive";
}

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function teacherName(teacher?: Teacher | null) {
  return teacher ? `${teacher.lastName} ${teacher.firstName}`.trim() : "";
}

function teacherAssignmentTexts(teacher: Teacher) {
  const mainClasses =
    teacher.mainClasses?.map((schoolClass) => `Titulaire : ${schoolClass.name}`) ?? [];
  const classSubjects =
    teacher.classSubjects?.map((classSubject) => {
      return `${classSubject.class.name} - ${classSubject.subject.name}`;
    }) ?? [];

  return [...mainClasses, ...classSubjects];
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

function compactLines(lines: Array<string | null | undefined>) {
  return lines
    .map((line) => line?.trim())
    .filter(Boolean)
    .join("\n");
}

function nlToHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

function officialHeaderHtml(value: string) {
  const [firstLine = "", ...restLines] = value.split(/\r?\n/);
  const restMarkup = restLines.length ? `<br/>${restLines.map((line) => escapeHtml(line)).join("<br/>")}` : "";

  return `<strong>${escapeHtml(firstLine)}</strong>${restMarkup}`;
}

function reportCardHeaderLeftText(establishment?: Establishment | null) {
  return (
    establishment?.reportCardHeaderLeft?.trim() ||
    compactLines([
      establishment?.name,
      establishment?.address,
      establishment?.city,
      establishment?.phone ? `Tel : ${establishment.phone}` : ""
    ])
  );
}

function reportCardHeaderCenterText(establishment?: Establishment | null) {
  return establishment?.reportCardHeaderCenter?.trim() || "";
}

function reportCardHeaderRightText(establishment?: Establishment | null) {
  return (
    establishment?.reportCardHeaderRight?.trim() ||
    reportCurrencyLabel(establishment?.currency)
  );
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

function getFriendlyRoleName(roleCode: string) {
  if (roleCode === "platform_super_admin") return "Super Admin Plateforme";
  if (roleCode === "admin") return "Admin établissement";
  return roleCode
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PERMISSION_GROUPS = [
  {
    category: "Tableau de Bord",
    permissions: [
      { code: "dashboard.read", label: "Voir le tableau de bord", description: "Accès à la synthèse globale de l'école et aux statistiques de fréquentation et financières." }
    ]
  },
  {
    category: "Configuration générale",
    permissions: [
      { code: "establishment.manage", label: "Gérer l'établissement", description: "Modifier le logo, les informations de contact, les signatures et configurer les paramètres de l'école." },
      { code: "academic_years.manage", label: "Gérer les années scolaires", description: "Créer, configurer et activer les années scolaires." }
    ]
  },
  {
    category: "Gestion des élèves",
    permissions: [
      { code: "students.read", label: "Consulter les élèves", description: "Accès à la liste des élèves, recherche et consultation des dossiers." },
      { code: "students.manage", label: "Gérer les fiches d'élèves", description: "Créer, modifier, suspendre ou exclure des élèves." },
      { code: "guardians.manage", label: "Gérer les parents/tuteurs", description: "Associer, modifier ou créer les fiches des tuteurs légaux." }
    ]
  },
  {
    category: "Structure & Enseignement",
    permissions: [
      { code: "classes.manage", label: "Gérer les classes", description: "Créer, modifier les classes et affecter les professeurs principaux." },
      { code: "subjects.manage", label: "Gérer les matières", description: "Ajouter des matières à l'établissement, configurer les coefficients par classe." },
      { code: "teachers.manage", label: "Gérer les enseignants", description: "Ajouter des enseignants à l'établissement et configurer leurs fiches." }
    ]
  },
  {
    category: "Comptabilité & Scolarité",
    permissions: [
      { code: "payments.read", label: "Consulter les finances", description: "Visualiser les indicateurs de paiement, les impayés et l'historique général." },
      { code: "payments.manage", label: "Gérer la facturation et encaisser", description: "Définir les frais obligatoires par classe et saisir les paiements reçus (génère des reçus)." }
    ]
  },
  {
    category: "Notes & Bulletins",
    permissions: [
      { code: "grades.read", label: "Consulter les notes", description: "Visualiser la grille des notes par classe et par élève." },
      { code: "grades.enter", label: "Saisir les notes d'évaluation", description: "Permet de créer des évaluations et d'entrer les notes obtenues par les élèves." },
      { code: "grades.validate", label: "Valider les périodes", description: "Valider ou clôturer officiellement les notes d'un trimestre/semestre." },
      { code: "report_cards.generate", label: "Calculer & Générer les bulletins", description: "Générer les bulletins officiels PDF de l'établissement." }
    ]
  },
  {
    category: "Outils & Sécurité locale",
    permissions: [
      { code: "imports.manage", label: "Importations de données", description: "Importer des élèves par fichier Excel/CSV." },
      { code: "backups.manage", label: "Gestion des sauvegardes", description: "Lancer des sauvegardes manuelles de la base et restaurer l'état de l'application." },
      { code: "users.manage", label: "Gérer les accès et rôles", description: "Créer des comptes d'utilisateurs locaux (secrétaire, comptable...) et modifier les droits d'accès." },
      { code: "audit_logs.read", label: "Consulter le journal d'audit", description: "Permet de voir qui a fait quoi sur l'application locale (sécurité)." }
    ]
  }
];

export function SchoolDashboard({
  currentUser,
  onLogout
}: {
  currentUser: AuthUser;
  onLogout: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  // Le Super Admin commence toujours sur la vue de gestion globale
  const [activeView, setActiveView] = useState<AppView>(
    currentUser.roleCode === "platform_super_admin" ? "super-admin" : "dashboard"
  );
  
  const hasPermission = (permission: string): boolean => {
    if (currentUser.roleCode === "platform_super_admin") return true;
    if (currentUser.roleCode === "admin") return true;
    return currentUser.permissions.includes(permission);
  };

  
  // États de gestion des utilisateurs locaux
  const [usersList, setUsersList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [userSaving, setUserSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    roleId: ""
  });

  // États de personnalisation des permissions des rôles locaux
  const [rolesSubTab, setRolesSubTab] = useState<"users" | "permissions">("users");
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<any | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionsSaving, setPermissionsSaving] = useState(false);

  // États de changement de mot de passe de l'utilisateur connecté
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const hasAccessToView = (view: AppView): boolean => {
    // Le Super Admin plateforme n'accède QU'à son panel global et aux logs
    if (currentUser.roleCode === "platform_super_admin") {
      return view === "super-admin" || view === "audit-logs";
    }

    // Les utilisateurs locaux n'ont PAS accès au panel super-admin
    if (view === "super-admin") return false;

    const permMap: Record<AppView, string[]> = {
      dashboard: [],
      settings: ["establishment.manage"],
      students: ["students.read"],
      documents: ["students.read"],
      teachers: ["teachers.manage"],
      structure: ["classes.manage", "subjects.manage"],
      payments: ["payments.read"],
      grades: ["grades.read", "grades.enter"],
      imports: ["imports.manage"],
      backups: ["backups.manage"],
      roles: ["users.manage"],
      "super-admin": [],
      "audit-logs": []
    };

    const required = permMap[view];
    const permissionAllowed = !required || required.length === 0 || required.some((permission) => hasPermission(permission));
    return permissionAllowed && isViewEnabledForEstablishment(view, selected);
  };

  const [structureTab, setStructureTab] = useState<StructureTab>("levels");
  const [paymentTab, setPaymentTab] = useState<PaymentTab>("fees");
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [alerts, setAlerts] = useState<string[]>(["API locale non chargee."]);
  const [online, setOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [assetSaving, setAssetSaving] = useState<EstablishmentAssetType | null>(null);
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
  const [gradesOverview, setGradesOverview] = useState<GradesOverview | null>(null);
  const [gradesSaving, setGradesSaving] = useState(false);
  const [gradeClassId, setGradeClassId] = useState("");
  const [gradePeriodId, setGradePeriodId] = useState("");
  const [gradeAssessmentId, setGradeAssessmentId] = useState("");
  const [gradeEntries, setGradeEntries] = useState<Record<string, { score: string; comment: string }>>({});
  const [reportCardData, setReportCardData] = useState<ReportCardData | null>(null);
  const [reportCardLoading, setReportCardLoading] = useState(false);
  const [importJobs, setImportJobs] = useState<ImportJobRecord[]>([]);
  const [importSaving, setImportSaving] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>>>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({
    lastName: "",
    firstName: "",
    gender: "",
    birthDate: "",
    matricule: "",
    className: ""
  });
  const [importClassId, setImportClassId] = useState("");
  const [backups, setBackups] = useState<BackupJob[]>([]);
  const [backupSaving, setBackupSaving] = useState(false);
  const [backupFilter, setBackupFilter] = useState<"ALL" | "SUCCESS" | "FAILED" | "RUNNING">("ALL");
  const [backupSearch, setBackupSearch] = useState("");
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("");
  const [editingStudentId, setEditingStudentId] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherSaving, setTeacherSaving] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState("");
  const [selectedDocumentStudentId, setSelectedDocumentStudentId] = useState("");
  const [studentDocuments, setStudentDocuments] = useState<StudentDocument[]>([]);
  const [selectedDossierStudentId, setSelectedDossierStudentId] = useState("");
  const [studentDossier, setStudentDossier] = useState<StudentDossier | null>(null);
  const [studentDossierLoading, setStudentDossierLoading] = useState(false);
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
    studentMatriculePadding: 4,
    reportCardColor: "#4f46e5",
    reportCardHeaderLeft: "",
    reportCardHeaderCenter: "",
    reportCardHeaderRight: "",
    reportCardTitle: "BULLETIN DE NOTES",
    reportCardSignerTitle: "Le Chef d'Etablissement",
    reportCardSignerName: ""
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
    teacherId: "",
    coefficient: "1"
  });
  const [teacherForm, setTeacherForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    employmentType: "vacataire",
    status: "active",
    hourlyRate: ""
  });
  const [mainTeacherForm, setMainTeacherForm] = useState({
    classId: "",
    teacherId: ""
  });
  const [teachingAssignmentForm, setTeachingAssignmentForm] = useState({
    classId: "",
    subjectId: "",
    teacherId: "",
    coefficient: "1"
  });
  const [studentForm, setStudentForm] = useState(() => emptyStudentForm());
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
  const [periodForm, setPeriodForm] = useState({
    name: "Trimestre 1",
    type: "TRIMESTER",
    startsAt: "",
    endsAt: ""
  });
  const [assessmentForm, setAssessmentForm] = useState({
    classSubjectId: "",
    name: "Devoir 1",
    maxScore: "20",
    weight: "1"
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
  const editingStudent = useMemo(
    () => students.find((student) => student.id === editingStudentId) ?? null,
    [editingStudentId, students]
  );
  const selectedPaymentStudent = useMemo(
    () => paymentOverview?.students.find((student) => student.id === selectedPaymentStudentId) ?? null,
    [paymentOverview, selectedPaymentStudentId]
  );
  const selectedGradeClass = useMemo(
    () => gradesOverview?.classes.find((schoolClass) => schoolClass.id === gradeClassId) ?? null,
    [gradeClassId, gradesOverview]
  );
  const selectedGradePeriod = useMemo(
    () => gradesOverview?.periods.find((period) => period.id === gradePeriodId) ?? null,
    [gradePeriodId, gradesOverview]
  );
  const selectedGradeAssessment = useMemo(
    () => gradesOverview?.assessments.find((assessment) => assessment.id === gradeAssessmentId) ?? null,
    [gradeAssessmentId, gradesOverview]
  );
  const gradeClassSubjects = selectedGradeClass?.classSubjects ?? [];
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
  const filteredTeachers = useMemo(() => {
    const search = teacherSearch.trim().toLowerCase();
    const filtered = teachers.filter((teacher) => {
      if (!search) {
        return true;
      }

      const searchable = [
        teacher.firstName,
        teacher.lastName,
        teacher.phone ?? "",
        teacher.email ?? "",
        teacher.status,
        employmentTypeLabel(teacher.employmentType),
        teacherStatusLabel(teacher.status),
        String(teacher.hourlyRate ?? 0),
        ...teacherAssignmentTexts(teacher)
      ]
        .join(" - ")
        .toLowerCase();

      return searchable.includes(search);
    });

    return [...filtered].sort((left, right) => {
      const statusOrder = left.status.localeCompare(right.status);
      return (
        statusOrder ||
        left.lastName.localeCompare(right.lastName) ||
        left.firstName.localeCompare(right.firstName)
      );
    });
  }, [teacherSearch, teachers]);
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
    if (!mounted || hasAccessToView(activeView)) {
      return;
    }

    setActiveView("dashboard");
  }, [activeView, mounted, selected, currentUser.permissions, currentUser.roleCode]);

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

    setStudentDossier(null);
    setSelectedDossierStudentId("");
    void loadDashboard(selectedId);
    void loadStructure(selectedId);
    void loadTeachers(selectedId);
    void loadStudents(selectedId);
    void loadPayments(selectedId);
    void loadGrades(selectedId);
    void loadImports(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || activeView !== "imports") {
      return;
    }
    void loadImports(selectedId);
  }, [activeView, selectedId]);

  useEffect(() => {
    if (!selectedId || activeView !== "backups") {
      return;
    }
    void loadBackups(selectedId);
  }, [activeView, selectedId]);

  useEffect(() => {
    if (!selectedId || activeView !== "roles") {
      return;
    }
    void loadUsers(selectedId);
    void loadRoles(selectedId);
  }, [activeView, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    void loadGrades(selectedId, gradeClassId, gradePeriodId);
  }, [gradeClassId, gradePeriodId, selectedId]);

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
    if (!gradesOverview) {
      setGradeEntries({});
      return;
    }

    const entries: Record<string, { score: string; comment: string }> = {};
    for (const student of gradesOverview.students) {
      const existingGrade = selectedGradeAssessment?.grades.find(
        (grade) => grade.studentId === student.id
      );
      entries[student.id] = {
        score: existingGrade ? String(existingGrade.score) : "",
        comment: existingGrade?.comment ?? ""
      };
    }
    setGradeEntries(entries);
  }, [gradesOverview, selectedGradeAssessment]);

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
      studentMatriculePadding: selected.studentMatriculePadding ?? 4,
      reportCardColor: selected.reportCardColor ?? "#1e3a8a",
      reportCardHeaderLeft: selected.reportCardHeaderLeft ?? "",
      reportCardHeaderCenter: selected.reportCardHeaderCenter ?? "",
      reportCardHeaderRight: selected.reportCardHeaderRight ?? "",
      reportCardTitle: selected.reportCardTitle ?? "BULLETIN DE NOTES",
      reportCardSignerTitle: selected.reportCardSignerTitle ?? "Le Chef d'Etablissement",
      reportCardSignerName: selected.reportCardSignerName ?? ""
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

  async function loadTeachers(establishmentId: string) {
    try {
      const data = await getTeachers(establishmentId);
      setTeachers(data);
    } catch {
      setAlerts(["Impossible de charger les enseignants. Verifier l'API."]);
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

  async function loadImports(establishmentId: string) {
    try {
      const data = await getImportJobs(establishmentId);
      setImportJobs(data);
    } catch {
      setAlerts(["Impossible de charger les jobs d'importation. Vérifier l'API."]);
    }
  }

  async function loadBackups(establishmentId: string) {
    try {
      const data = await getBackups(establishmentId);
      setBackups(data);
    } catch {
      setAlerts(["Impossible de charger les sauvegardes. Vérifier l'API."]);
    }
  }

  async function loadUsers(establishmentId: string) {
    try {
      const data = await getEstablishmentUsers(establishmentId);
      setUsersList(data);
    } catch {
      setAlerts(["Impossible de charger les utilisateurs de l'établissement."]);
    }
  }

  async function loadRoles(establishmentId: string) {
    try {
      const data = await getEstablishmentRoles(establishmentId);
      setRolesList(data);
    } catch {
      setAlerts(["Impossible de charger les rôles disponibles."]);
    }
  }

  async function handleSelfChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess("✅ Mot de passe mis à jour avec succès !");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      setPwError(errorMessage(error, "❌ Erreur lors du changement de mot de passe."));
    } finally {
      setPwSaving(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!userForm.roleId) {
      setAlerts(["Veuillez sélectionner un rôle."]);
      return;
    }
    setUserSaving(true);
    try {
      await createEstablishmentUser(selected.id, userForm);
      setUserForm({ fullName: "", email: "", password: "", phone: "", roleId: "" });
      setAlerts(["Utilisateur créé avec succès !"]);
      await loadUsers(selected.id);
    } catch (error: any) {
      setAlerts([errorMessage(error, "Erreur lors de la création de l'utilisateur.")]);
    } finally {
      setUserSaving(false);
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !editingUser) return;
    setUserSaving(true);
    try {
      await updateEstablishmentUser(selected.id, editingUser.id, {
        fullName: userForm.fullName,
        phone: userForm.phone,
        roleId: userForm.roleId,
        newPassword: userForm.password || undefined
      });
      setEditingUser(null);
      setUserForm({ fullName: "", email: "", password: "", phone: "", roleId: "" });
      setAlerts(["Utilisateur mis à jour avec succès !"]);
      await loadUsers(selected.id);
    } catch (error: any) {
      setAlerts([errorMessage(error, "Erreur lors de la mise à jour.")]);
    } finally {
      setUserSaving(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!selected) return;
    if (!confirm("Voulez-vous vraiment désactiver ce compte utilisateur ?")) return;
    try {
      await deleteEstablishmentUser(selected.id, userId);
      setAlerts(["Compte utilisateur désactivé."]);
      await loadUsers(selected.id);
    } catch (error: any) {
      setAlerts([errorMessage(error, "Erreur lors de la désactivation.")]);
    }
  }

  function startEditUser(user: any) {
    setEditingUser(user);
    setUserForm({
      fullName: user.fullName,
      email: user.email,
      password: "",
      phone: user.phone || "",
      roleId: user.roleId
    });
  }

  async function handleSaveRolePermissions() {
    if (!selected || !selectedRoleForPermissions) return;
    setPermissionsSaving(true);
    try {
      await updateRolePermissions(selected.id, selectedRoleForPermissions.id, selectedPermissions);
      setAlerts(["Permissions du rôle enregistrées avec succès !"]);
      await loadRoles(selected.id);
    } catch (error: any) {
      setAlerts([errorMessage(error, "Erreur lors de l'enregistrement des permissions.")]);
    } finally {
      setPermissionsSaving(false);
    }
  }

  function handleSelectRoleForPermissions(roleId: string) {
    const role = rolesList.find((r) => r.id === roleId);
    if (!role) {
      setSelectedRoleForPermissions(null);
      setSelectedPermissions([]);
      return;
    }
    setSelectedRoleForPermissions(role);
    const existingPerms = role.permissions?.map((p: any) => p.permission.code) || [];
    setSelectedPermissions(existingPerms);
  }

  function handleTogglePermission(permCode: string) {
    setSelectedPermissions((prev) =>
      prev.includes(permCode)
        ? prev.filter((p) => p !== permCode)
        : [...prev, permCode]
    );
  }

  async function handleStartBackup() {
    if (!selected) {
      setAlerts(["Sélectionner un établissement."]);
      return;
    }
    setBackupSaving(true);
    try {
      const job = await startBackup(selected.id);
      await loadBackups(selected.id);
      if (job.status === "SUCCESS") {
        setAlerts(["Sauvegarde terminée avec succès."]);
      } else if (job.status === "FAILED") {
        setAlerts([`Sauvegarde échouée : ${job.errorMessage || "Erreur inconnue."}`]);
      }
    } catch (error) {
      setAlerts([errorMessage(error, "Impossible de lancer la sauvegarde.")]);
    } finally {
      setBackupSaving(false);
    }
  }

  async function handleRestoreBackup(backupId: string) {
    if (!selected) return;
    if (!window.confirm("⚠️ ATTENTION : La restauration va REMPLACER toutes les données actuelles de cet établissement par celles de la sauvegarde.\n\nCette action est irréversible. Continuer ?")) {
      return;
    }
    setRestoringBackupId(backupId);
    try {
      await restoreBackup(selected.id, backupId);
      setAlerts(["✅ Restauration terminée avec succès ! Rechargez la page pour voir les données restaurées."]);
      // Recharger les données
      void loadDashboard(selected.id);
      void loadStructure(selected.id);
      void loadStudents(selected.id);
      void loadTeachers(selected.id);
      void loadPayments(selected.id);
    } catch (error) {
      setAlerts([errorMessage(error, "Impossible de restaurer la sauvegarde.")]);
    } finally {
      setRestoringBackupId(null);
    }
  }

  async function handleDeleteBackup(backupId: string) {
    if (!selected) return;
    if (!window.confirm("Supprimer définitivement cette sauvegarde et son fichier ?")) {
      return;
    }
    try {
      await deleteBackup(selected.id, backupId);
      await loadBackups(selected.id);
      setAlerts(["Sauvegarde supprimée."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Impossible de supprimer la sauvegarde.")]);
    }
  }

  async function loadGrades(establishmentId: string, classId = gradeClassId, periodId = gradePeriodId) {
    try {
      const data = await getGradesOverview(establishmentId, {
        academicYearId: activeYear?.id,
        classId: classId || undefined,
        periodId: periodId || undefined
      });
      setGradesOverview(data);
      setGradeClassId((current) => current || data.selectedClassId || "");
      setGradePeriodId((current) => current || data.selectedPeriodId || "");
      setGradeAssessmentId((current) =>
        current && data.assessments.some((assessment) => assessment.id === current)
          ? current
          : data.assessments[0]?.id ?? ""
      );
      const selectedClassForForm =
        data.classes.find((schoolClass) => schoolClass.id === data.selectedClassId) ?? null;
      setAssessmentForm((current) => ({
        ...current,
        classSubjectId:
          current.classSubjectId &&
          selectedClassForForm?.classSubjects.some(
            (classSubject) => classSubject.id === current.classSubjectId
          )
            ? current.classSubjectId
            : selectedClassForForm?.classSubjects[0]?.id || ""
      }));
    } catch {
      setGradesOverview(null);
      setAlerts(["Impossible de charger les notes. Verifier l'API."]);
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

  async function loadStudentDossier(establishmentId: string, studentId: string) {
    setStudentDossierLoading(true);
    try {
      const data = await getStudentDossier(establishmentId, studentId);
      setStudentDossier(data);
      setSelectedDossierStudentId(data.student.id);
    } catch (error) {
      setStudentDossier(null);
      setAlerts([errorMessage(error, "Impossible de charger le dossier central de cet eleve.")]);
    } finally {
      setStudentDossierLoading(false);
    }
  }

  async function openStudentDossierBySearch() {
    if (!selected) {
      return;
    }

    const matricule = studentSearch.split(" - ")[0]?.trim();
    if (!matricule) {
      setAlerts(["Saisir ou choisir un matricule avant d'ouvrir le dossier."]);
      return;
    }

    setStudentDossierLoading(true);
    try {
      const data = await getStudentDossierByMatricule(selected.id, matricule);
      setStudentDossier(data);
      setSelectedDossierStudentId(data.student.id);
      setAlerts([`Dossier central charge : ${data.student.matricule}.`]);
    } catch (error) {
      setStudentDossier(null);
      setAlerts([errorMessage(error, "Aucun dossier trouve avec ce matricule.")]);
    } finally {
      setStudentDossierLoading(false);
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

  async function handleUploadIdentityAsset(assetType: EstablishmentAssetType, file: File) {
    if (!selected) {
      setAlerts(["Creer ou selectionner un etablissement avant d'ajouter son identite visuelle."]);
      return;
    }

    if (!allowedIdentityImageTypes.includes(file.type)) {
      setAlerts(["Image refusee : seuls JPG, PNG et WEBP sont acceptes pour le logo et le cachet."]);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAlerts(["Image refusee : la taille maximale est 2 Mo."]);
      return;
    }

    setAssetSaving(assetType);
    try {
      const base64Content = await fileToBase64(file);
      const updated = await uploadEstablishmentAsset(selected.id, {
        assetType,
        originalName: file.name,
        mimeType: file.type,
        base64Content
      });
      replaceEstablishment(updated);
      setOnline(true);
      setAlerts([
        assetType === "LOGO"
          ? "Logo enregistre. Il sera utilise sur les recus, bulletins et documents."
          : assetType === "STAMP"
            ? "Cachet enregistre. Il sera disponible pour les impressions officielles."
            : "Signature enregistree. Elle sera disponible pour les impressions officielles."
      ]);
    } catch (error) {
      setAlerts([errorMessage(error, "Enregistrement de l'image impossible.")]);
    } finally {
      setAssetSaving(null);
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
    await loadTeachers(establishmentId);
    await loadStudents(establishmentId);
  }

  function replaceEstablishment(updated: Establishment) {
    setEstablishments((items) =>
      items.map((item) => (item.id === updated.id ? updated : item))
    );
    setPaymentOverview((current) =>
      current && current.establishment.id === updated.id
        ? { ...current, establishment: updated }
        : current
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
        mainTeacherId: classForm.mainTeacherId || undefined,
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
        teacherId: assignForm.teacherId || undefined,
        coefficient: Number(assignForm.coefficient || 1)
      });
      setAssignForm({ classId: "", subjectId: "", teacherId: "", coefficient: "1" });
      await loadStructure(selected.id);
      await loadTeachers(selected.id);
      setAlerts(["Matiere affectee a la classe avec son coefficient."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Affectation impossible.")]);
    } finally {
      setStructureSaving(false);
    }
  }

  function resetTeacherForm() {
    setEditingTeacherId("");
    setTeacherForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      employmentType: "vacataire",
      status: "active",
      hourlyRate: ""
    });
  }

  function handleEditTeacher(teacher: Teacher) {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      phone: teacher.phone ?? "",
      email: teacher.email ?? "",
      employmentType: teacher.employmentType || "vacataire",
      status: teacher.status || "active",
      hourlyRate: teacher.hourlyRate ? String(teacher.hourlyRate) : ""
    });
  }

  async function handleSaveTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setAlerts(["Creer ou selectionner un etablissement avant d'ajouter un enseignant."]);
      return;
    }

    if (!isValidPhone(teacherForm.phone)) {
      setAlerts(["Le telephone de l'enseignant doit contenir exactement 8 chiffres."]);
      return;
    }

    if (!isValidEmail(teacherForm.email)) {
      setAlerts(["L'email de l'enseignant doit etre complet, par exemple prof@ecole.bf."]);
      return;
    }

    const hourlyRate = teacherForm.hourlyRate ? Number(teacherForm.hourlyRate) : 0;
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
      setAlerts(["Le salaire par heure doit etre un montant positif ou zero."]);
      return;
    }

    setTeacherSaving(true);
    try {
      const wasEditing = Boolean(editingTeacherId);
      const payload = {
        firstName: teacherForm.firstName.trim(),
        lastName: teacherForm.lastName.trim(),
        phone: teacherForm.phone,
        email: teacherForm.email.trim(),
        employmentType: teacherForm.employmentType,
        status: teacherForm.status,
        hourlyRate
      };

      if (editingTeacherId) {
        await updateTeacher(selected.id, editingTeacherId, payload);
      } else {
        await createTeacher(selected.id, payload);
      }

      resetTeacherForm();
      await loadTeachers(selected.id);
      await loadDashboard(selected.id);
      setAlerts([
        wasEditing
          ? "Enseignant modifie avec ses informations de paie."
          : "Enseignant ajoute. Vous pouvez maintenant l'affecter aux classes et matieres."
      ]);
    } catch (error) {
      setAlerts([errorMessage(error, "Enregistrement de l'enseignant impossible.")]);
    } finally {
      setTeacherSaving(false);
    }
  }

  async function handleTeacherStatus(teacher: Teacher, status: "active" | "inactive" | "suspended") {
    if (!selected) {
      return;
    }

    setTeacherSaving(true);
    try {
      await updateTeacher(selected.id, teacher.id, { status });
      await loadTeachers(selected.id);
      setAlerts([`Statut de ${teacherName(teacher)} mis a jour : ${teacherStatusLabel(status)}.`]);
    } catch (error) {
      setAlerts([errorMessage(error, "Mise a jour du statut impossible.")]);
    } finally {
      setTeacherSaving(false);
    }
  }

  async function handleAssignMainTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      return;
    }

    if (!mainTeacherForm.classId) {
      setAlerts(["Choisir une classe avant d'affecter le titulaire."]);
      return;
    }

    setTeacherSaving(true);
    try {
      await assignMainTeacher(selected.id, mainTeacherForm.classId, {
        teacherId: mainTeacherForm.teacherId || undefined
      });
      setMainTeacherForm({ classId: "", teacherId: "" });
      await loadStructure(selected.id);
      await loadTeachers(selected.id);
      setAlerts(["Titulaire de classe mis a jour."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Affectation du titulaire impossible.")]);
    } finally {
      setTeacherSaving(false);
    }
  }

  async function handleAssignTeaching(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      return;
    }

    if (!teachingAssignmentForm.classId || !teachingAssignmentForm.subjectId || !teachingAssignmentForm.teacherId) {
      setAlerts(["Choisir la classe, la matiere et l'enseignant avant d'affecter."]);
      return;
    }

    const coefficient = Number(teachingAssignmentForm.coefficient || 1);
    if (!Number.isFinite(coefficient) || coefficient < 0) {
      setAlerts(["Le coefficient doit etre positif ou zero."]);
      return;
    }

    setTeacherSaving(true);
    try {
      await assignSubjectToClass(selected.id, teachingAssignmentForm.classId, {
        subjectId: teachingAssignmentForm.subjectId,
        teacherId: teachingAssignmentForm.teacherId,
        coefficient
      });
      setTeachingAssignmentForm({
        classId: teachingAssignmentForm.classId,
        subjectId: "",
        teacherId: "",
        coefficient: "1"
      });
      await loadStructure(selected.id);
      await loadTeachers(selected.id);
      setAlerts(["Enseignant affecte a la matiere pour cette classe."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Affectation de l'enseignant impossible.")]);
    } finally {
      setTeacherSaving(false);
    }
  }

  function resetStudentForm(classId = studentForm.classId) {
    setEditingStudentId("");
    setStudentForm(emptyStudentForm(classId));
  }

  function handleEditStudent(student: Student) {
    const primaryGuardian =
      student.guardians?.find((item) => item.isPrimary) ?? student.guardians?.[0];
    const secondaryGuardian = student.guardians?.find((item) => !item.isPrimary);
    const enrollment = student.enrollments?.[0];

    setEditingStudentId(student.id);
    setStudentForm({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender ?? "",
      birthDate: toDateInput(student.birthDate),
      birthPlace: student.birthPlace ?? "",
      nationality: student.nationality ?? "Burkinabe",
      classId: enrollment?.classId ?? "",
      enrollmentType: enrollment?.enrollmentType ?? "NEW",
      status: student.status,
      primaryGuardian: primaryGuardian
        ? {
            relationship: primaryGuardian.relationship,
            firstName: primaryGuardian.guardian.firstName,
            lastName: primaryGuardian.guardian.lastName,
            phone: primaryGuardian.guardian.phone ?? "",
            email: primaryGuardian.guardian.email ?? "",
            profession: primaryGuardian.guardian.profession ?? "",
            address: primaryGuardian.guardian.address ?? ""
          }
        : emptyGuardianForm("Pere"),
      secondaryGuardian: secondaryGuardian
        ? {
            relationship: secondaryGuardian.relationship,
            firstName: secondaryGuardian.guardian.firstName,
            lastName: secondaryGuardian.guardian.lastName,
            phone: secondaryGuardian.guardian.phone ?? "",
            email: secondaryGuardian.guardian.email ?? "",
            profession: secondaryGuardian.guardian.profession ?? "",
            address: secondaryGuardian.guardian.address ?? ""
          }
        : emptyGuardianForm("Mere")
    });
    setAlerts([`Dossier charge : ${student.matricule} - ${student.lastName} ${student.firstName}.`]);
  }

  async function handleStudentStatus(student: Student, status: Student["status"]) {
    if (!selected) {
      return;
    }

    setStudentSaving(true);
    try {
      await updateStudent(selected.id, student.id, { status });
      if (editingStudentId === student.id) {
        setStudentForm((current) => ({ ...current, status }));
      }
      await loadStudents(selected.id);
      await loadDashboard(selected.id);
      setAlerts([
        `Statut de ${student.lastName} ${student.firstName} mis a jour : ${studentStatusLabel(status)}.`
      ]);
    } catch (error) {
      setAlerts([errorMessage(error, "Mise a jour du statut eleve impossible.")]);
    } finally {
      setStudentSaving(false);
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
      const payload = {
        firstName: studentForm.firstName.trim(),
        lastName: studentForm.lastName.trim(),
        gender: gender || undefined,
        birthDate: studentForm.birthDate,
        birthPlace: studentForm.birthPlace.trim(),
        nationality: studentForm.nationality.trim(),
        classId: studentForm.classId,
        enrollmentType: studentForm.enrollmentType,
        guardians
      };
      const wasEditing = Boolean(editingStudentId);

      if (editingStudentId) {
        await updateStudent(selected.id, editingStudentId, {
          ...payload,
          status: studentForm.status
        });
      } else {
        await createStudent(selected.id, payload);
      }

      resetStudentForm(studentForm.classId);
      await loadStudents(selected.id);
      await loadDashboard(selected.id);
      setAlerts([
        wasEditing
          ? "Dossier eleve modifie avec ses responsables et son inscription."
          : "Eleve inscrit dans la classe selectionnee."
      ]);
    } catch (error) {
      setAlerts([errorMessage(error, "Enregistrement impossible. Verifier les champs et l'API.")]);
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

  async function handleCreatePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected || !activeYear) {
      setAlerts(["Creer ou activer une annee scolaire avant les periodes."]);
      return;
    }

    setGradesSaving(true);
    try {
      const period = await createGradePeriod(selected.id, {
        academicYearId: activeYear.id,
        name: periodForm.name.trim(),
        type: periodForm.type,
        startsAt: periodForm.startsAt,
        endsAt: periodForm.endsAt
      });
      setGradePeriodId(period.id);
      setPeriodForm({ ...periodForm, name: "" });
      await loadGrades(selected.id, gradeClassId, period.id);
      setAlerts(["Periode de notes creee."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Creation de la periode impossible.")]);
    } finally {
      setGradesSaving(false);
    }
  }

  async function handleCreateAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected || !gradePeriodId) {
      setAlerts(["Creer ou choisir une periode avant l'evaluation."]);
      return;
    }

    if (!assessmentForm.classSubjectId) {
      setAlerts(["Affecter une matiere a cette classe avant de creer une evaluation."]);
      return;
    }

    const maxScore = Number(assessmentForm.maxScore || 20);
    const weight = Number(assessmentForm.weight || 1);
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      setAlerts(["Le bareme doit etre superieur a zero."]);
      return;
    }
    if (!Number.isFinite(weight) || weight < 0) {
      setAlerts(["Le coefficient de l'evaluation doit etre positif ou zero."]);
      return;
    }

    setGradesSaving(true);
    try {
      const assessment = await createAssessment(selected.id, {
        periodId: gradePeriodId,
        classSubjectId: assessmentForm.classSubjectId,
        name: assessmentForm.name.trim(),
        maxScore,
        weight
      });
      setGradeAssessmentId(assessment.id);
      setAssessmentForm({
        ...assessmentForm,
        name: "Devoir 1"
      });
      await loadGrades(selected.id, gradeClassId, gradePeriodId);
      setGradeAssessmentId(assessment.id);
      setAlerts(["Evaluation creee. Vous pouvez saisir les notes."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Creation de l'evaluation impossible.")]);
    } finally {
      setGradesSaving(false);
    }
  }

  async function handleSaveGrades(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected || !selectedGradeAssessment || !gradesOverview) {
      setAlerts(["Choisir une evaluation avant d'enregistrer les notes."]);
      return;
    }

    const entries: Array<{ studentId: string; score: number; comment?: string }> = [];
    for (const student of gradesOverview.students) {
      const entry = gradeEntries[student.id];
      if (!entry?.score.trim()) {
        continue;
      }
      const score = Number(entry.score);
      if (!Number.isFinite(score)) {
        continue;
      }
      entries.push({
        studentId: student.id,
        score,
        comment: entry.comment.trim() || undefined
      });
    }

    if (!entries.length) {
      setAlerts(["Saisir au moins une note avant d'enregistrer."]);
      return;
    }

    const maxScore = selectedGradeAssessment.maxScore;
    const hasInvalid = entries.some((entry) => entry.score < 0 || entry.score > maxScore);
    if (hasInvalid) {
      setAlerts([`Les notes doivent etre entre 0 et ${maxScore}.`]);
      return;
    }

    setGradesSaving(true);
    try {
      await saveGrades(selected.id, {
        assessmentId: selectedGradeAssessment.id,
        enteredBy: "Administration",
        grades: entries
      });
      await loadGrades(selected.id, gradeClassId, gradePeriodId);
      setAlerts(["Notes enregistrees et rattachees au dossier eleve."]);
    } catch (error) {
      setAlerts([errorMessage(error, "Enregistrement des notes impossible.")]);
    } finally {
      setGradesSaving(false);
    }
  }

  function handleCsvFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || "");
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (lines.length === 0) {
        setAlerts(["Le fichier CSV est vide."]);
        return;
      }

      // Détecter le délimiteur (souvent ";" ou "," dans Excel francophone)
      const firstLine = lines[0];
      const delimiter = firstLine.includes(";") ? ";" : ",";

      // Extraire les en-têtes
      const headers = firstLine.split(delimiter).map(h => h.replace(/^["']|["']$/g, "").trim());
      setCsvHeaders(headers);

      // Extraire les lignes
      const rows: Array<Record<string, string>> = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.replace(/^["']|["']$/g, "").trim());
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || "";
        });
        rows.push(row);
      }
      setCsvRows(rows);
      setAlerts([`${rows.length} lignes chargées avec succès. Veuillez mapper les colonnes.`]);
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleStartImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setAlerts(["Sélectionner un établissement d'abord."]);
      return;
    }
    if (csvRows.length === 0) {
      setAlerts(["Aucune donnée CSV n'est chargée."]);
      return;
    }
    if (!importMapping.lastName || !importMapping.firstName) {
      setAlerts(["Le nom et le prénom de l'élève sont obligatoires pour faire l'import."]);
      return;
    }

    setImportSaving(true);
    try {
      const job = await startStudentImport(selected.id, {
        type: "STUDENT",
        mapping: importMapping,
        rows: csvRows,
        classId: importClassId || undefined
      });
      await loadImports(selected.id);
      await loadStudents(selected.id);
      
      if (job.status === "success") {
        setAlerts([`Importation réussie ! ${job.validRows} élève(s) importé(s) avec succès.`]);
        // Reset le formulaire
        setCsvHeaders([]);
        setCsvRows([]);
      } else if (job.status === "completed_with_errors") {
        setAlerts([`Importation complétée avec des erreurs. ${job.validRows} élèves importés, ${job.errorRows} ligne(s) rejetée(s). Consultez le journal d'importation ci-dessous.`]);
      } else {
        setAlerts([`L'importation a échoué. ${job.errorRows} erreur(s) détectée(s).`]);
      }
    } catch (error) {
      setAlerts([errorMessage(error, "Erreur lors du traitement de l'importation.")]);
    } finally {
      setImportSaving(false);
    }
  }

  async function printReportCards(periodId: string, classId: string, filterStudentId?: string) {
    if (!selected) {
      setAlerts(["Sélectionner un établissement."]);
      return;
    }
    setReportCardLoading(true);
    try {
      const data = await getReportCard(selected.id, { periodId, classId });
      setReportCardData(data);

      const studentsToPrint = filterStudentId
        ? data.students.filter((s) => s.student.id === filterStudentId)
        : data.students;

      if (studentsToPrint.length === 0) {
        setAlerts(["Aucun élève correspondant trouvé pour l'impression."]);
        return;
      }

      const printWindow = window.open("", "_blank", "width=950,height=900");
      if (!printWindow) {
        setAlerts(["Fenêtre d'impression bloquée. Autoriser les popups."]);
        return;
      }

      const logoUrl = apiFileUrl(data.establishment?.logoUrl);
      const stampUrl = apiFileUrl(data.establishment?.stampUrl);
      const directorSignatureUrl = apiFileUrl(data.establishment?.directorSignatureUrl);
      const headerLeftText = reportCardHeaderLeftText(data.establishment);
      const headerCenterText = reportCardHeaderCenterText(data.establishment);
      const headerRightText = reportCardHeaderRightText(data.establishment);
      const reportTitle = data.establishment?.reportCardTitle?.trim() || "BULLETIN DE NOTES";
      const signerTitle = data.establishment?.reportCardSignerTitle?.trim() || "Le Chef d'Etablissement";
      const signerName = data.establishment?.reportCardSignerName?.trim() || "";

      const logoMarkup = logoUrl
        ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo" />`
        : `<div class="logo-fallback">${escapeHtml(data.establishment?.name.slice(0, 2).toUpperCase() ?? "EC")}</div>`;
      const centerTextMarkup = headerCenterText
        ? `<div class="header-center-text">${nlToHtml(headerCenterText)}</div>`
        : "";

      const stampMarkup = stampUrl
        ? `<img class="stamp" src="${escapeHtml(stampUrl)}" alt="Cachet" />`
        : "";

      const signatureMarkup = directorSignatureUrl
        ? `<img class="signature" src="${escapeHtml(directorSignatureUrl)}" alt="Signature Directeur" />`
        : "";
      const signerNameMarkup = signerName ? `<div class="sig-name">${escapeHtml(signerName)}</div>` : "";

      const savedReportColor = data.establishment?.reportCardColor?.toLowerCase();
      const themeColor =
        !savedReportColor || savedReportColor === "#1e3a8a" || savedReportColor === "#4f46e5"
          ? "#f6a2aa"
          : data.establishment?.reportCardColor || "#f6a2aa";

      let html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Bulletins - ${escapeHtml(data.schoolClass.name)} - ${escapeHtml(data.period.name)}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .bulletin-page { page-break-after: always; box-shadow: none; margin: 0; }
      .bulletin-page:last-child { page-break-after: avoid; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: #2b2b2b; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.15; }
    .bulletin-page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 28px 18px 24px; background: ${themeColor}; display: flex; flex-direction: column; color: #000; }
    .report-header { display: grid; grid-template-columns: 1.35fr 1fr 1fr; align-items: start; min-height: 132px; }
    .school-heading { text-align: center; font-weight: 800; font-size: 12px; line-height: 1.55; padding-top: 28px; }
    .school-heading strong { display: block; text-transform: uppercase; }
    .header-center { text-align: center; padding-top: 16px; font-size: 10px; font-weight: 700; }
    .header-center-text { padding-top: 36px; line-height: 1.35; }
    .identity-mark { display: grid; justify-items: center; gap: 8px; padding-top: 8px; text-align: center; font-weight: 800; }
    .logo { width: 88px; height: 88px; object-fit: contain; }
    .logo-fallback { display: grid; width: 88px; height: 88px; place-items: center; border: 2px solid #111; border-radius: 50%; color: #111; font-weight: 900; font-size: 26px; background: transparent; }
    .currency-label { font-size: 12px; text-transform: uppercase; }
    .bulletin-title { display: grid; justify-items: center; gap: 4px; margin: -12px 0 6px; text-align: center; }
    .bulletin-title strong { font-size: 19px; font-style: italic; font-weight: 900; text-transform: uppercase; }
    .bulletin-title span { font-size: 15px; font-weight: 900; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px 12px; margin: 0 18px 4px; font-size: 12px; }
    .meta-grid .center { text-align: center; }
    .meta-grid .right { text-align: right; }
    .meta-grid strong { font-weight: 900; }
    table { width: 100%; border-collapse: collapse; background: transparent; color: #000; }
    th, td { border: 1px solid #000; padding: 4px 6px; text-align: center; vertical-align: middle; }
    th { font-size: 9px; font-weight: 900; }
    .grades-table { font-size: 10px; }
    .grades-table td { height: 28px; }
    .subject-name { text-align: left; font-weight: 900; text-transform: uppercase; }
    .group-header td { height: 22px; font-weight: 900; text-align: center; text-transform: uppercase; }
    .subtotal-row td { height: 26px; font-weight: 900; }
    .group-summary td { height: 28px; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 900; }
    .grand-total td { height: 30px; font-weight: 900; }
    .appreciation { text-align: left; font-weight: 900; }
    .summary-table { margin-top: 0; font-size: 11px; }
    .summary-table td { height: 22px; padding: 3px 6px; }
    .summary-label { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 700; text-align: right; }
    .summary-value { font-weight: 900; }
    .rank-box { font-weight: 900; font-size: 14px; }
    .decision-signature { margin-top: 0; }
    .decision-signature td { height: 98px; padding: 4px 8px; vertical-align: top; }
    .decision-title { font-size: 13px; margin-bottom: 10px; }
    .decision-box { display: grid; place-items: center; min-height: 58px; width: 78%; margin: 0 auto; border: 1px solid #000; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-weight: 900; }
    .official-signature { position: relative; min-height: 94px; text-align: center; font-size: 11px; }
    .official-signature .city-line { font-size: 12px; margin-bottom: 2px; }
    .official-signature .sig-title { display: block; font-size: 14px; font-weight: 900; margin-bottom: 0; }
    .official-signature .sig-name { position: relative; z-index: 2; margin-top: 42px; font-size: 10px; font-weight: 900; }
    .stamp { max-width: 124px; max-height: 110px; position: absolute; left: 50%; top: 24px; transform: translateX(-50%) rotate(-10deg); opacity: 0.88; }
    .signature { max-width: 120px; max-height: 48px; object-fit: contain; position: absolute; left: 50%; top: 34px; transform: translateX(-50%); z-index: 2; }
    .bank-line { margin: 5px 0 0 18px; font-weight: 900; }
    .disclaimer { margin-top: auto; text-align: center; font-size: 9px; font-weight: 900; }
  </style>
</head>
<body>`;

      // Build each student page
      for (const rs of studentsToPrint) {
        const totalCoef = rs.subjectAverages.reduce((sum: number, s: any) => sum + s.coefficient, 0);
        const birthStr = rs.student.birthDate ? new Date(rs.student.birthDate).toLocaleDateString("fr-FR") : "-";
        const totalWeighted = rs.generalAverage !== null ? Math.round(rs.generalAverage * totalCoef * 100) / 100 : null;

        // Grouper les matières par subjectGroup
        const groups = new Map<string, typeof rs.subjectAverages>();
        for (const sa of rs.subjectAverages) {
          const groupName = (sa as any).subjectGroup || "AUTRES MATIERES";
          if (!groups.has(groupName)) groups.set(groupName, []);
          groups.get(groupName)!.push(sa);
        }

        // Générer le HTML des lignes du tableau par groupe
        let tableRows = "";
        for (const [groupName, subjects] of groups) {
          const groupCoef = subjects.reduce((s: number, sa: any) => s + sa.coefficient, 0);
          const groupWeighted = subjects.reduce((s: number, sa: any) => {
            if (sa.average === null) return s;
            return s + sa.average * sa.coefficient;
          }, 0);
          const groupDenom = subjects.reduce((s: number, sa: any) => sa.average !== null ? s + sa.coefficient : s, 0);
          const groupMoy = groupDenom > 0 ? groupWeighted / groupDenom : null;

          tableRows += '<tr class="group-header"><td colspan="8">' + escapeHtml(groupName.toUpperCase()) + '</td></tr>';

          for (const sa of subjects) {
            const grades = sa.grades || [];
            const interros = grades.filter((g: any) => g.weight <= 1);
            const devoirs = grades.filter((g: any) => g.weight > 1 && g.weight <= 2);
            const compos = grades.filter((g: any) => g.weight > 2);
            
            const avgInterro = interros.length ? (interros.reduce((s: number, g: any) => s + (g.score >= 0 ? g.score : 0), 0) / interros.length) : null;
            const avgDevoir = devoirs.length ? (devoirs.reduce((s: number, g: any) => s + (g.score >= 0 ? g.score : 0), 0) / devoirs.length) : null;
            const avgCompo = compos.length ? (compos.reduce((s: number, g: any) => s + (g.score >= 0 ? g.score : 0), 0) / compos.length) : null;

            const weighted = sa.average !== null ? Math.round(sa.average * sa.coefficient * 100) / 100 : null;
            
            let appreciation = "";
            if (sa.average !== null) {
              if (sa.average >= 16) appreciation = "Excellent";
              else if (sa.average >= 14) appreciation = "Très Bien";
              else if (sa.average >= 12) appreciation = "Bien";
              else if (sa.average >= 10) appreciation = "Assez Bien";
              else if (sa.average >= 8) appreciation = "Passable";
              else if (sa.average >= 5) appreciation = "Insuffisant";
              else appreciation = "Faible";
            }

            tableRows += '<tr>'
              + '<td class="subject-name">' + escapeHtml(sa.subjectName) + '</td>'
              + '<td>' + sa.coefficient + '</td>'
              + '<td>' + formatScore(avgInterro) + '</td>'
              + '<td>' + formatScore(avgDevoir) + '</td>'
              + '<td>' + formatScore(avgCompo) + '</td>'
              + '<td><strong>' + formatScore(sa.average) + '</strong></td>'
              + '<td>' + formatScore(weighted) + '</td>'
              + '<td class="appreciation">' + appreciation + '</td>'
              + '</tr>';
          }

          tableRows += '<tr class="subtotal-row">'
            + '<td style="text-align: left;">Total ' + escapeHtml(groupName.toLowerCase()) + '</td>'
            + '<td>' + groupCoef + '</td>'
            + '<td colspan="3"></td>'
            + '<td><strong></strong></td>'
            + '<td><strong>' + formatScore(groupWeighted) + '</strong></td>'
            + '<td></td>'
            + '</tr>'
            + '<tr class="group-summary">'
            + '<td colspan="3">Moyenne : <strong>' + formatScore(groupMoy) + '</strong></td>'
            + '<td colspan="3">Meilleure Moyenne : <strong>' + formatScore(data.bestAverage) + '</strong></td>'
            + '<td colspan="2">Rang : <strong>' + (rs.rank !== null ? rs.rank + "e" : "-") + '</strong></td>'
            + '</tr>';
        }

        const decisionText = rs.generalAverage !== null && rs.generalAverage >= 10
          ? "ADMIS EN CLASSE SUPERIEURE"
          : "AJOURNE";
        const rankText = rs.rank !== null ? rs.rank + " e" : "-";
        const periodName = data.period.name;
        const reportDate = new Date().toLocaleDateString("fr-FR");
        const cityName = data.establishment?.city ?? "";
        const studentName = `${rs.student.lastName.toUpperCase()} ${rs.student.firstName}`.trim();

        html += '<div class="bulletin-page">'
          + '<div class="report-header">'
          + '<div class="school-heading">' + officialHeaderHtml(headerLeftText) + '</div>'
          + '<div class="header-center">' + centerTextMarkup + '</div>'
          + '<div class="identity-mark">' + logoMarkup + '<div class="currency-label">' + nlToHtml(headerRightText) + '</div></div>'
          + '</div>'

          + '<div class="bulletin-title">'
          + '<strong>' + escapeHtml(reportTitle) + '</strong>'
          + '<span>' + escapeHtml(periodName) + '</span>'
          + '</div>'

          + '<div class="meta-grid">'
          + '<span>Année scolaire : <strong>' + escapeHtml(data.academicYear?.name ?? "") + '</strong></span>'
          + '<span></span>'
          + '<span class="right">Effectif : <strong>' + data.totalStudents + '</strong></span>'
          + "<span style=\"grid-column: 1 / 3;\">Nom de l'élève : <strong>" + escapeHtml(studentName) + '</strong></span>'
          + '<span class="right">Classe redoublée : <strong></strong></span>'
          + '<span>Né(e) : <strong>' + birthStr + '</strong></span>'
          + '<span class="center">Matricule : <strong>' + escapeHtml(rs.student.matricule) + '</strong></span>'
          + '<span class="right">Classe : <strong>' + escapeHtml(data.schoolClass.name) + '</strong></span>'
          + '</div>'

          + '<table class="grades-table"><thead><tr>'
          + '<th style="width: 27%;">Matières</th>'
          + '<th style="width: 6%;">Coef</th>'
          + '<th style="width: 9%;">Interro<br/>(1)</th>'
          + '<th style="width: 8%;">Dev<br/>(2)</th>'
          + '<th style="width: 8%;">Compo<br/>(2)</th>'
          + '<th style="width: 8%;">Moy</th>'
          + '<th style="width: 10%;">Notes<br/>Pondérées</th>'
          + '<th style="width: 24%;">Appréciation et Signatures</th>'
          + '</tr></thead><tbody>'
          + tableRows
          + '<tr class="grand-total"><td colspan="8"></td></tr>'
          + '</tbody></table>'

          + '<table class="summary-table"><tbody>'
          + '<tr>'
          + '<td colspan="2" class="summary-label">TOTAL COEFFICIENT :</td>'
          + '<td class="summary-value">' + totalCoef + '</td>'
          + '<td colspan="2" class="summary-label">TOTAL NOTES PONDEREES :</td>'
          + '<td class="summary-value">' + formatScore(totalWeighted) + '</td>'
          + '</tr>'
          + '<tr>'
          + '<td colspan="2" class="summary-label">MOYENNE SUR 20</td>'
          + '<td class="summary-value">' + formatScore(rs.generalAverage) + '</td>'
          + '<td colspan="3"><strong>Nombres d’heures d’absences</strong> &nbsp; justifiées&nbsp;&nbsp; <strong>0</strong> &nbsp;&nbsp; non justifiées&nbsp;&nbsp; <strong>0</strong></td>'
          + '</tr>'
          + '<tr>'
          + '<td colspan="2" class="summary-label">RETRAIT DES POINTS</td>'
          + '<td class="summary-value">0,00</td>'
          + '<td colspan="3"></td>'
          + '</tr>'
          + '<tr>'
          + '<td colspan="2" class="summary-label">MOYENNE DEFINITIVE</td>'
          + '<td class="summary-value">' + formatScore(rs.generalAverage) + '</td>'
          + '<td colspan="3" style="text-align:left;">Conduite :</td>'
          + '</tr>'
          + '<tr>'
          + "<td class=\"summary-label\">Moyenne de l’élève</td>"
          + '<td class="summary-value">' + formatScore(rs.generalAverage) + '</td>'
          + '<td rowspan="5" class="rank-box">Rang<br/>' + escapeHtml(rankText) + '</td>'
          + '<td colspan="3">Rappel Moyennes</td>'
          + '</tr>'
          + '<tr>'
          + '<td class="summary-label">Moyenne de la classe</td>'
          + '<td class="summary-value">' + formatScore(data.classAverage) + '</td>'
          + '<td>1er Trimestre</td><td>2e Trimestre</td><td>-</td>'
          + '</tr>'
          + '<tr>'
          + '<td class="summary-label">Meilleure moyenne</td>'
          + '<td class="summary-value">' + formatScore(data.bestAverage) + '</td>'
          + '<td>-</td><td>-</td><td>-</td>'
          + '</tr>'
          + '<tr>'
          + '<td class="summary-label">Plus faible moyenne</td>'
          + '<td class="summary-value">' + formatScore(data.worstAverage) + '</td>'
          + '<td colspan="3"></td>'
          + '</tr>'
          + '<tr>'
          + '<td class="summary-label">Moyenne annuelle</td>'
          + '<td class="summary-value">' + formatScore(rs.generalAverage) + '</td>'
          + '<td colspan="2">' + (rs.generalAverage !== null && rs.generalAverage >= 10 ? "Passable" : "Insuffisant") + '</td>'
          + '<td>Rang annuel : ' + escapeHtml(rankText) + '</td>'
          + '</tr>'
          + '</tbody></table>'

          + '<table class="decision-signature"><tbody><tr>'
          + '<td style="width: 50%;">'
          + '<div class="decision-title">Appréciation du conseil de classe</div>'
          + '<div class="decision-box">' + escapeHtml(decisionText) + '</div>'
          + '</td>'
          + '<td class="official-signature">'
          + '<div class="city-line">' + escapeHtml(cityName) + ', le ' + reportDate + '</div>'
          + '<span class="sig-title">' + escapeHtml(signerTitle) + '</span>'
          + signatureMarkup + stampMarkup + signerNameMarkup
          + '<div class="disclaimer">Toute surcharge rend ce bulletin sans valeur.</div>'
          + '</td>'
          + '</tr></tbody></table>'
          + '<div class="bank-line">Compte Bancaire : N° F</div>'
          + '</div>';
      }

      html += '</body></html>';

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      setAlerts([errorMessage(error, "Génération des bulletins impossible.")]);
    } finally {
      setReportCardLoading(false);
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
    const logoUrl = apiFileUrl(establishment.logoUrl);
    const stampUrl = apiFileUrl(establishment.stampUrl);
    const cashierSignatureUrl = apiFileUrl(establishment.cashierSignatureUrl);
    const logoMarkup = logoUrl
      ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(
          establishment.name
        )}" />`
      : `<div class="logo-fallback">${escapeHtml(establishment.name.slice(0, 2).toUpperCase())}</div>`;
    const stampMarkup = stampUrl
      ? `<img class="stamp" src="${escapeHtml(stampUrl)}" alt="Cachet ${escapeHtml(
          establishment.name
        )}" />`
      : "";
    const signatureMarkup = cashierSignatureUrl
      ? `<img class="signature-image" src="${escapeHtml(cashierSignatureUrl)}" alt="Signature caisse" />`
      : "";
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
    footer { display: flex; justify-content: space-between; gap: 24px; margin-top: 44px; font-size: 13px; }
    .signature-block { min-width: 180px; text-align: center; }
    .signature-block span { display: block; margin-bottom: 10px; color: #4b5563; }
    .stamp { max-width: 120px; max-height: 80px; object-fit: contain; }
    .signature-image { display: block; max-width: 135px; max-height: 54px; object-fit: contain; margin: 0 auto 6px; }
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
      <div class="signature-block">
        <span>Signature et cachet</span>
        ${signatureMarkup}
        ${stampMarkup}
      </div>
    </footer>
  </div>
  <script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 300); });</script>
</body>
</html>`);
    printWindow.document.close();
  }

  const selectedLicense = currentLicense(selected);
  const selectedLicenseStatus = licenseStatus(selected);
  const selectedLicenseBlocked =
    currentUser.roleCode !== "platform_super_admin" && Boolean(selected) && isLicenseBlocked(selected);

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
          {navGroups
            .map((group) => {
              const visibleItems = group.items.filter((item) => hasAccessToView(item.view));
              return { ...group, items: visibleItems };
            })
            .filter((group) => group.items.length > 0)
            .map((group) => (
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
            {currentUser.roleCode === "platform_super_admin" ? (
              <>
                <h1 style={{ background: "linear-gradient(90deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Gestion Globale de la Plateforme
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>Administration centrale — Établissements, Licences, Comptes</p>
              </>
            ) : (
              <>
                <h1>{selected?.name ?? "Administration etablissement"}</h1>
                <p>{selected ? `${selected.city ?? "Ville non renseignee"} - ${selected.country}` : "MVP local en preparation"}</p>
              </>
            )}
          </div>
          <div className="topbar-actions">
            <div className="status-pill">
              <span className={`status-dot ${online ? "online" : ""}`} />
              {online ? "API connectee" : "API hors ligne"}
            </div>

            <div className="user-profile-widget" style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "10px", borderLeft: "1px solid var(--line)", paddingLeft: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: "12px", lineHeight: "1.3" }}>
                <strong style={{ color: "#0f172a", fontWeight: 700, fontSize: "13px" }}>{currentUser.fullName}</strong>
                <span style={{ color: "#475569", fontSize: "11px", fontWeight: 600 }}>
                  {getFriendlyRoleName(currentUser.roleCode)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(true);
                  setPwError("");
                  setPwSuccess("");
                  setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                }}
                style={{
                  padding: "6px 12px",
                  height: "auto",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "1.5px solid #94a3b8",
                  background: "#ffffff",
                  color: "#0f172a",
                  borderRadius: "6px",
                  cursor: "pointer",
                  marginRight: "4px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                Mot de passe
              </button>
              <button
                type="button"
                onClick={onLogout}
                style={{
                  padding: "6px 12px",
                  height: "auto",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "1.5px solid #94a3b8",
                  background: "#f1f5f9",
                  color: "#0f172a",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                Déconnexion
              </button>

            </div>
          </div>
        </header>

        {selectedLicenseBlocked ? (
          <div className="inline-alerts" style={{ marginBottom: "14px" }}>
            <div className="alert-item">
              <Lock size={16} />
              <span>
                Licence {selectedLicenseStatus === "SUSPENDED" ? "suspendue" : "expiree"} : les modules de
                travail sont verrouilles pour cet etablissement.
                {selectedLicense?.expiresAt ? ` Expiration : ${formatDate(selectedLicense.expiresAt)}.` : ""}
              </span>
            </div>
          </div>
        ) : null}

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
                    <label className="field">
                      <span>Couleur du bulletin</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          disabled={!selected}
                          type="color"
                          value={settingsForm.reportCardColor || "#1e3a8a"}
                          onChange={(event) =>
                            setSettingsForm({ ...settingsForm, reportCardColor: event.target.value })
                          }
                          style={{ width: "48px", height: "36px", padding: "2px", cursor: "pointer", border: "1px solid var(--line)", borderRadius: "6px" }}
                        />
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {settingsForm.reportCardColor || "#1e3a8a"} — en-tête et bordures du bulletin
                        </span>
                      </div>
                    </label>
                    <div className="section-title field full">
                      <strong>Modele de bulletin</strong>
                      <span>Entete officielle, titre et signature de direction</span>
                    </div>
                    <label className="field">
                      <span className="required">Titre du bulletin</span>
                      <input
                        disabled={!selected}
                        required
                        maxLength={80}
                        placeholder="Exemple : BULLETIN DE NOTES"
                        value={settingsForm.reportCardTitle}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, reportCardTitle: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="required">Signataire officiel</span>
                      <input
                        disabled={!selected}
                        required
                        maxLength={80}
                        placeholder="Exemple : Le Chef d'Etablissement ou Le Censeur"
                        value={settingsForm.reportCardSignerTitle}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, reportCardSignerTitle: event.target.value })
                        }
                      />
                      <small>Le parent ne signe pas le bulletin.</small>
                    </label>
                    <label className="field full">
                      <span>Nom du signataire</span>
                      <input
                        disabled={!selected}
                        maxLength={120}
                        placeholder="Exemple : M. Ouedraogo Moussa"
                        value={settingsForm.reportCardSignerName}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, reportCardSignerName: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Entete gauche</span>
                      <textarea
                        disabled={!selected}
                        placeholder={"LYCEE PRIVE MB (MOHAMED BOUAZIZI)\n03 BP 4177 BOBO DIOULASSO 03\nTel : +226 69 00 95 95"}
                        value={settingsForm.reportCardHeaderLeft}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, reportCardHeaderLeft: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Entete centre</span>
                      <textarea
                        disabled={!selected}
                        placeholder={"Texte central facultatif sous le logo"}
                        value={settingsForm.reportCardHeaderCenter}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, reportCardHeaderCenter: event.target.value })
                        }
                      />
                    </label>
                    <label className="field full">
                      <span>Entete droite</span>
                      <textarea
                        disabled={!selected}
                        placeholder={"FRANCS CFA"}
                        value={settingsForm.reportCardHeaderRight}
                        onChange={(event) =>
                          setSettingsForm({ ...settingsForm, reportCardHeaderRight: event.target.value })
                        }
                      />
                      <small>Laissez vide pour afficher automatiquement FRANCS CFA avec la devise XOF.</small>
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

                <div className="settings-column">
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

                  <div className="settings-block">
                    <div className="section-title">
                      <strong>Identite visuelle</strong>
                      <span>Logo, cachet et signatures</span>
                    </div>
                    <div className="identity-assets">
                      {establishmentAssets.map((asset) => (
                        <BrandAssetUploader
                          assetUrl={selected?.[asset.field] ?? ""}
                          detail={asset.detail}
                          disabled={!selected || assetSaving !== null}
                          key={asset.assetType}
                          saving={assetSaving === asset.assetType}
                          title={asset.title}
                          onUpload={(file) => void handleUploadIdentityAsset(asset.assetType, file)}
                        />
                      ))}
                    </div>
                    <p className="panel-note">
                      Formats acceptes : JPG, PNG ou WEBP. Taille maximale : 2 Mo par image.
                    </p>
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
                      <span>Titulaire</span>
                      <select
                        disabled={!selected || !activeYear || !teachers.length}
                        value={classForm.mainTeacherId}
                        onChange={(event) =>
                          setClassForm({ ...classForm, mainTeacherId: event.target.value })
                        }
                      >
                        <option value="">
                          {teachers.length ? "Aucun titulaire" : "Ajouter un enseignant d'abord"}
                        </option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacherName(teacher)}
                          </option>
                        ))}
                      </select>
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
                    <div className="field full">
                      <button
                        aria-pressed={classForm.tuitionEnabled}
                        className={`tuition-toggle ${classForm.tuitionEnabled ? "active" : ""}`}
                        disabled={!selected || !activeYear}
                        type="button"
                        onClick={() =>
                          setClassForm({
                            ...classForm,
                            tuitionEnabled: !classForm.tuitionEnabled
                          })
                        }
                      >
                        <span className="tuition-toggle-copy">
                          <strong>Scolarite de la classe</strong>
                          <small>
                            {classForm.tuitionEnabled
                              ? "Les tranches seront creees avec cette classe."
                              : "Activer si cette classe doit avoir ses propres tranches."}
                          </small>
                        </span>
                        <span className="switch-control" aria-hidden="true">
                          <span />
                        </span>
                      </button>
                    </div>
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
                      detail: `${schoolClass.level?.name ?? "Sans niveau"} - ${schoolClass.classSubjects?.length ?? 0} matiere(s)${
                        schoolClass.mainTeacher ? ` - Titulaire : ${teacherName(schoolClass.mainTeacher)}` : ""
                      }`
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
                      <span>Enseignant</span>
                      <select
                        disabled={!selected || !teachers.length}
                        value={assignForm.teacherId}
                        onChange={(event) => setAssignForm({ ...assignForm, teacherId: event.target.value })}
                      >
                        <option value="">Non affecte</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacherName(teacher)}
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

            {activeView === "teachers" ? (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Enseignants</h2>
                  <span>Fiche, taux horaire et affectations multiples</span>
                </div>
                <Users size={20} />
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

              <div className="teacher-workspace">
                <form className="settings-block" onSubmit={handleSaveTeacher}>
                  <div className="section-title">
                    <strong>{editingTeacherId ? "Modifier l'enseignant" : "Nouvel enseignant"}</strong>
                    <span>Salaire horaire et contact</span>
                  </div>
                  <div className="setup-form">
                    <label className="field">
                      <span className="required">Prenom</span>
                      <input
                        disabled={!selected || teacherSaving}
                        minLength={2}
                        placeholder="Exemple : Moussa"
                        required
                        value={teacherForm.firstName}
                        onChange={(event) =>
                          setTeacherForm({ ...teacherForm, firstName: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="required">Nom</span>
                      <input
                        disabled={!selected || teacherSaving}
                        minLength={2}
                        placeholder="Exemple : Ouedraogo"
                        required
                        value={teacherForm.lastName}
                        onChange={(event) =>
                          setTeacherForm({ ...teacherForm, lastName: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Telephone</span>
                      <input
                        disabled={!selected || teacherSaving}
                        inputMode="numeric"
                        maxLength={8}
                        pattern="[0-9]{8}"
                        placeholder="Exemple : 72007342"
                        value={teacherForm.phone}
                        onChange={(event) =>
                          setTeacherForm({ ...teacherForm, phone: cleanPhone(event.target.value) })
                        }
                      />
                      <small>8 chiffres exactement si renseigne.</small>
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input
                        disabled={!selected || teacherSaving}
                        pattern="^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$"
                        placeholder="Exemple : prof@ecole.bf"
                        type="email"
                        value={teacherForm.email}
                        onChange={(event) =>
                          setTeacherForm({ ...teacherForm, email: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="required">Type</span>
                      <select
                        disabled={!selected || teacherSaving}
                        value={teacherForm.employmentType}
                        onChange={(event) =>
                          setTeacherForm({ ...teacherForm, employmentType: event.target.value })
                        }
                      >
                        <option value="vacataire">Vacataire</option>
                        <option value="permanent">Permanent</option>
                        <option value="contractuel">Contractuel</option>
                        <option value="stagiaire">Stagiaire</option>
                      </select>
                    </label>
                    <label className="field">
                      <span className="required">Statut</span>
                      <select
                        disabled={!selected || teacherSaving}
                        value={teacherForm.status}
                        onChange={(event) =>
                          setTeacherForm({ ...teacherForm, status: event.target.value })
                        }
                      >
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                        <option value="suspended">Suspendu</option>
                      </select>
                    </label>
                    <label className="field full">
                      <span>Salaire par heure</span>
                      <input
                        disabled={!selected || teacherSaving}
                        min={0}
                        placeholder="Exemple : 2500"
                        step={1}
                        type="number"
                        value={teacherForm.hourlyRate}
                        onChange={(event) =>
                          setTeacherForm({ ...teacherForm, hourlyRate: event.target.value })
                        }
                      />
                      <small>Montant horaire visible dans la recherche et la liste.</small>
                    </label>
                    <div className="teacher-form-actions field full">
                      <button className="primary-button" disabled={!selected || teacherSaving} type="submit">
                        {teacherSaving ? <Loader2 size={17} /> : <Save size={17} />}
                        {editingTeacherId ? "Modifier" : "Enregistrer"}
                      </button>
                      {editingTeacherId ? (
                        <button className="ghost-button" disabled={teacherSaving} type="button" onClick={resetTeacherForm}>
                          Annuler
                        </button>
                      ) : null}
                    </div>
                  </div>
                </form>

                <div className="settings-block">
                  <div className="section-title">
                    <strong>Affectations</strong>
                    <span>Un enseignant peut prendre plusieurs classes</span>
                  </div>
                  <form className="setup-form" onSubmit={handleAssignMainTeacher}>
                    <div className="section-title compact field full">
                      <strong>Titulaire de classe</strong>
                      <span>Responsable principal d'une classe</span>
                    </div>
                    <label className="field">
                      <span className="required">Classe</span>
                      <select
                        disabled={!selected || !classes.length || teacherSaving}
                        required
                        value={mainTeacherForm.classId}
                        onChange={(event) =>
                          setMainTeacherForm({ ...mainTeacherForm, classId: event.target.value })
                        }
                      >
                        <option value="">Choisir une classe</option>
                        {classes.map((schoolClass) => (
                          <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Enseignant</span>
                      <select
                        disabled={!selected || !teachers.length || teacherSaving}
                        value={mainTeacherForm.teacherId}
                        onChange={(event) =>
                          setMainTeacherForm({ ...mainTeacherForm, teacherId: event.target.value })
                        }
                      >
                        <option value="">Aucun titulaire</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacherName(teacher)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="primary-button field full" disabled={!selected || teacherSaving} type="submit">
                      {teacherSaving ? <Loader2 size={17} /> : <Save size={17} />}
                      Affecter le titulaire
                    </button>
                  </form>

                  <form className="setup-form teacher-assignment-form" onSubmit={handleAssignTeaching}>
                    <div className="section-title compact field full">
                      <strong>Matiere enseignee</strong>
                      <span>Affectation classe + matiere + coefficient</span>
                    </div>
                    <label className="field">
                      <span className="required">Classe</span>
                      <select
                        disabled={!selected || !classes.length || teacherSaving}
                        required
                        value={teachingAssignmentForm.classId}
                        onChange={(event) =>
                          setTeachingAssignmentForm({
                            ...teachingAssignmentForm,
                            classId: event.target.value
                          })
                        }
                      >
                        <option value="">Choisir une classe</option>
                        {classes.map((schoolClass) => (
                          <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="required">Matiere</span>
                      <select
                        disabled={!selected || !subjects.length || teacherSaving}
                        required
                        value={teachingAssignmentForm.subjectId}
                        onChange={(event) =>
                          setTeachingAssignmentForm({
                            ...teachingAssignmentForm,
                            subjectId: event.target.value
                          })
                        }
                      >
                        <option value="">Choisir une matiere</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="required">Enseignant</span>
                      <select
                        disabled={!selected || !teachers.length || teacherSaving}
                        required
                        value={teachingAssignmentForm.teacherId}
                        onChange={(event) =>
                          setTeachingAssignmentForm({
                            ...teachingAssignmentForm,
                            teacherId: event.target.value
                          })
                        }
                      >
                        <option value="">Choisir un enseignant</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacherName(teacher)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="required">Coefficient</span>
                      <input
                        disabled={!selected || teacherSaving}
                        min={0}
                        required
                        step="0.25"
                        type="number"
                        value={teachingAssignmentForm.coefficient}
                        onChange={(event) =>
                          setTeachingAssignmentForm({
                            ...teachingAssignmentForm,
                            coefficient: event.target.value
                          })
                        }
                      />
                    </label>
                    <button className="primary-button field full" disabled={!selected || teacherSaving} type="submit">
                      {teacherSaving ? <Loader2 size={17} /> : <Plus size={17} />}
                      Affecter a la matiere
                    </button>
                  </form>
                </div>

                <div className="settings-block teacher-records-panel">
                  <div className="section-title">
                    <strong>Liste des enseignants</strong>
                    <span>{filteredTeachers.length} dossier(s)</span>
                  </div>
                  <label className="field">
                    <span>Recherche</span>
                    <input
                      list="teacher-search-suggestions"
                      placeholder="Nom, telephone, taux horaire, classe ou matiere"
                      value={teacherSearch}
                      onChange={(event) => setTeacherSearch(event.target.value)}
                    />
                    <datalist id="teacher-search-suggestions">
                      {teachers.map((teacher) => (
                        <option
                          key={teacher.id}
                          value={`${teacherName(teacher)} - ${formatMoney(teacher.hourlyRate ?? 0, selected?.currency)}/h`}
                        />
                      ))}
                    </datalist>
                  </label>
                  <div className="student-table-wrap teacher-table-wrap">
                    {filteredTeachers.length ? (
                      <table className="student-table teacher-table">
                        <thead>
                          <tr>
                            <th>Enseignant</th>
                            <th>Contact</th>
                            <th>Paie</th>
                            <th>Affectations</th>
                            <th>Statut</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTeachers.map((teacher) => {
                            const assignments = teacherAssignmentTexts(teacher);
                            return (
                              <tr key={teacher.id}>
                                <td>
                                  <strong>{teacherName(teacher)}</strong>
                                  <span>{employmentTypeLabel(teacher.employmentType)}</span>
                                </td>
                                <td>
                                  <strong>{teacher.phone || "Telephone non renseigne"}</strong>
                                  <span>{teacher.email || "Email non renseigne"}</span>
                                </td>
                                <td>
                                  <strong>{formatMoney(teacher.hourlyRate ?? 0, selected?.currency)}</strong>
                                  <span>Par heure</span>
                                </td>
                                <td>
                                  {assignments.length ? (
                                    <>
                                      {assignments.slice(0, 3).map((assignment) => (
                                        <span key={assignment}>{assignment}</span>
                                      ))}
                                      {assignments.length > 3 ? (
                                        <span>+ {assignments.length - 3} autre(s)</span>
                                      ) : null}
                                    </>
                                  ) : (
                                    <span>Aucune affectation</span>
                                  )}
                                </td>
                                <td>
                                  <span className={`status-badge ${teacher.status}`}>
                                    {teacherStatusLabel(teacher.status)}
                                  </span>
                                </td>
                                <td>
                                  <div className="teacher-action-row">
                                    <button
                                      className="ghost-button small"
                                      type="button"
                                      onClick={() => handleEditTeacher(teacher)}
                                    >
                                      Modifier
                                    </button>
                                    {teacher.status === "active" ? (
                                      <button
                                        className="ghost-button small danger-button"
                                        disabled={teacherSaving}
                                        type="button"
                                        onClick={() => void handleTeacherStatus(teacher, "suspended")}
                                      >
                                        Suspendre
                                      </button>
                                    ) : (
                                      <button
                                        className="ghost-button small"
                                        disabled={teacherSaving}
                                        type="button"
                                        onClick={() => void handleTeacherStatus(teacher, "active")}
                                      >
                                        Activer
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-state compact">Aucun enseignant trouve.</div>
                    )}
                  </div>
                </div>
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
                    <strong>{editingStudent ? "Modification du dossier" : "Nouvelle inscription"}</strong>
                    <span>
                      {editingStudent
                        ? editingStudent.matricule
                        : activeYear
                          ? `Annee : ${activeYear.name}`
                          : "Classe requise"}
                    </span>
                  </div>
                  <div className="setup-form">
                    <label className="field full">
                      <span>{editingStudent ? "Matricule du dossier" : "Matricule genere"}</span>
                      <input
                        readOnly
                        value={editingStudent?.matricule ?? previewStudentMatricule(selected, activeYear)}
                      />
                      <small>
                        {editingStudent
                          ? "Le matricule reste verrouille pour eviter les doublons."
                          : "Genere automatiquement selon le format de l'etablissement."}
                      </small>
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
                    {editingStudent ? (
                      <label className="field full">
                        <span className="required">Statut du dossier</span>
                        <select
                          disabled={!selected || studentSaving}
                          value={studentForm.status}
                          onChange={(event) =>
                            setStudentForm({
                              ...studentForm,
                              status: event.target.value as Student["status"]
                            })
                          }
                        >
                          <option value="ACTIVE">Actif</option>
                          <option value="TRANSFERRED">Transfere</option>
                          <option value="DROPPED_OUT">Abandon</option>
                          <option value="EXCLUDED">Exclu</option>
                          <option value="GRADUATED">Diplome</option>
                        </select>
                      </label>
                    ) : null}
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
                    <div className="student-form-actions field full">
                      {editingStudent ? (
                        <button
                          className="ghost-button"
                          disabled={studentSaving}
                          type="button"
                          onClick={() => resetStudentForm()}
                        >
                          Annuler
                        </button>
                      ) : null}
                      <button className="primary-button" disabled={!selected || studentSaving} type="submit">
                        {studentSaving ? <Loader2 size={17} /> : editingStudent ? <Save size={17} /> : <Plus size={17} />}
                        {editingStudent ? "Modifier le dossier" : "Inscrire l'eleve"}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="settings-block student-records-panel">
                  <div className="section-title">
                    <strong>Liste des eleves</strong>
                    <span>{filteredStudents.length} dossier(s)</span>
                  </div>
                  <div className="student-list-tools with-action">
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
                    <button
                      className="ghost-button student-dossier-search-button"
                      disabled={!selected || studentDossierLoading || !studentSearch.trim()}
                      type="button"
                      onClick={() => void openStudentDossierBySearch()}
                    >
                      {studentDossierLoading ? <Loader2 size={16} /> : <Eye size={16} />}
                      Ouvrir dossier
                    </button>
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
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((student) => {
                            const enrollment = student.enrollments?.[0];
                            const primaryGuardian =
                              student.guardians?.find((item) => item.isPrimary) ?? student.guardians?.[0];
                            return (
                              <tr
                                className={selectedDossierStudentId === student.id ? "selected" : ""}
                                key={student.id}
                              >
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
                                  <span className={`status-badge ${studentStatusClass(student.status)}`}>
                                    {studentStatusLabel(student.status)}
                                  </span>
                                </td>
                                <td>
                                  <div className="table-action-row">
                                    <button
                                      className="ghost-button small"
                                      disabled={studentSaving}
                                      type="button"
                                      onClick={() => handleEditStudent(student)}
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      className="ghost-button small"
                                      disabled={!selected || studentDossierLoading}
                                      type="button"
                                      onClick={() => selected && void loadStudentDossier(selected.id, student.id)}
                                    >
                                      Dossier
                                    </button>
                                    {student.status === "ACTIVE" ? (
                                      <button
                                        className="ghost-button small danger-button"
                                        disabled={studentSaving}
                                        type="button"
                                        onClick={() => void handleStudentStatus(student, "DROPPED_OUT")}
                                      >
                                        Sortir
                                      </button>
                                    ) : (
                                      <button
                                        className="ghost-button small"
                                        disabled={studentSaving}
                                        type="button"
                                        onClick={() => void handleStudentStatus(student, "ACTIVE")}
                                      >
                                        Reactiver
                                      </button>
                                    )}
                                  </div>
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

                  {studentDossierLoading && !studentDossier ? (
                    <div className="empty-state compact">Chargement du dossier central...</div>
                  ) : null}

                  {studentDossier ? (
                    <div className="student-dossier-panel">
                      <div className="section-title">
                        <strong>Dossier central</strong>
                        <span>
                          {studentDossier.student.matricule} - {studentDossier.student.lastName}{" "}
                          {studentDossier.student.firstName}
                        </span>
                      </div>
                      <div className="student-dossier-summary">
                        <div>
                          <span>Statut</span>
                          <strong>{studentStatusLabel(studentDossier.student.status)}</strong>
                        </div>
                        <div>
                          <span>Cursus</span>
                          <strong>{studentDossier.cursus.length} annee(s)</strong>
                        </div>
                        <div>
                          <span>Documents</span>
                          <strong>{studentDossier.documents.length}</strong>
                        </div>
                        <div>
                          <span>Reste a payer</span>
                          <strong>{formatMoney(studentDossier.finances.balance, selected?.currency)}</strong>
                        </div>
                      </div>
                      <div className="student-dossier-grid">
                        <div className="student-dossier-section">
                          <div className="section-title compact">
                            <strong>Cursus scolaire</strong>
                            <span>{studentDossier.cursus.length} ligne(s)</span>
                          </div>
                          <div className="dossier-list">
                            {studentDossier.cursus.length ? (
                              studentDossier.cursus.map((enrollment) => (
                                <div className="dossier-row" key={enrollment.id}>
                                  <strong>{enrollment.academicYearName}</strong>
                                  <span>
                                    {enrollment.className}
                                    {enrollment.levelName ? ` - ${enrollment.levelName}` : ""}
                                  </span>
                                  <small>
                                    {enrollment.mainTeacherName
                                      ? `Titulaire : ${enrollment.mainTeacherName}`
                                      : "Titulaire non renseigne"}
                                  </small>
                                </div>
                              ))
                            ) : (
                              <div className="empty-state compact">Aucune inscription historisee.</div>
                            )}
                          </div>
                        </div>

                        <div className="student-dossier-section">
                          <div className="section-title compact">
                            <strong>Finances</strong>
                            <span>{studentDossier.finances.payments.length} paiement(s)</span>
                          </div>
                          <div className="dossier-kpis">
                            <span>Du : {formatMoney(studentDossier.finances.totalDue, selected?.currency)}</span>
                            <span>Paye : {formatMoney(studentDossier.finances.paid, selected?.currency)}</span>
                            <span>Reste : {formatMoney(studentDossier.finances.balance, selected?.currency)}</span>
                          </div>
                          <div className="dossier-list">
                            {studentDossier.finances.assignments.length ? (
                              studentDossier.finances.assignments.slice(0, 5).map((assignment) => (
                                <div className="dossier-row" key={assignment.id}>
                                  <strong>{assignment.feeName}</strong>
                                  <span>{assignment.academicYearName}</span>
                                  <small>
                                    Reste : {formatMoney(assignment.balance, selected?.currency)}
                                  </small>
                                </div>
                              ))
                            ) : (
                              <div className="empty-state compact">Aucun frais affecte.</div>
                            )}
                          </div>
                        </div>

                        <div className="student-dossier-section">
                          <div className="section-title compact">
                            <strong>Documents</strong>
                            <span>{studentDossier.documents.length} piece(s)</span>
                          </div>
                          <div className="dossier-list">
                            {studentDossier.documents.length ? (
                              studentDossier.documents.slice(0, 5).map((document) => (
                                <div className="dossier-row" key={document.id}>
                                  <strong>{documentTypeLabel(document.documentType)}</strong>
                                  <span>{documentDisplayName(document)}</span>
                                  <small>{new Date(document.createdAt).toLocaleDateString("fr-FR")}</small>
                                </div>
                              ))
                            ) : (
                              <div className="empty-state compact">Aucun document scanne.</div>
                            )}
                          </div>
                        </div>

                        <div className="student-dossier-section">
                          <div className="section-title compact">
                            <strong>Pedagogie</strong>
                            <span>
                              {studentDossier.pedagogy.grades.length} note(s),{" "}
                              {studentDossier.pedagogy.reportCards.length} bulletin(s)
                            </span>
                          </div>
                          <div className="dossier-list">
                            {studentDossier.pedagogy.reportCards.length ? (
                              studentDossier.pedagogy.reportCards.slice(0, 5).map((reportCard) => (
                                <div className="dossier-row" key={reportCard.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                  <div>
                                    <strong>{reportCard.periodName ?? "Période"}</strong>
                                    <span>{reportCard.academicYearName ?? "Année non renseignée"}</span>
                                    <small>
                                      Moyenne : {reportCard.average !== null ? Number(reportCard.average).toFixed(2) : "-"} - Rang : {reportCard.rank ?? "-"}
                                    </small>
                                  </div>
                                  <button
                                    className="ghost-button"
                                    type="button"
                                    onClick={() => void printReportCards(reportCard.periodId, reportCard.classId, studentDossier.student.id)}
                                    title="Imprimer ce bulletin"
                                    style={{ padding: "4px 8px", height: "auto", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                                  >
                                    <Printer size={12} />
                                    Imprimer
                                  </button>
                                </div>
                              ))
                            ) : studentDossier.pedagogy.grades.length ? (
                              studentDossier.pedagogy.grades.slice(0, 5).map((grade) => (
                                <div className="dossier-row" key={grade.id}>
                                  <strong>{grade.subjectName}</strong>
                                  <span>
                                    {grade.assessmentName} - {grade.periodName}
                                  </span>
                                  <small>
                                    Note : {grade.score}/{grade.maxScore}
                                  </small>
                                </div>
                              ))
                            ) : (
                              <div className="empty-state compact">Notes et bulletins a venir.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
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

            {activeView === "grades" ? (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Notes</h2>
                  <span>Periodes, evaluations et saisie des notes</span>
                </div>
                <BookOpen size={20} />
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

              {gradesOverview ? (
                <div className="grades-workspace">
                  <div className="settings-block">
                    <div className="section-title">
                      <strong>Periodes</strong>
                      <span>{gradesOverview.academicYear.name}</span>
                    </div>
                    <form className="setup-form" onSubmit={handleCreatePeriod}>
                      <label className="field">
                        <span className="required">Nom</span>
                        <input
                          disabled={gradesSaving}
                          minLength={2}
                          placeholder="Exemple : Trimestre 1"
                          required
                          value={periodForm.name}
                          onChange={(event) =>
                            setPeriodForm({ ...periodForm, name: event.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span className="required">Type</span>
                        <select
                          disabled={gradesSaving}
                          value={periodForm.type}
                          onChange={(event) =>
                            setPeriodForm({ ...periodForm, type: event.target.value })
                          }
                        >
                          <option value="TRIMESTER">Trimestre</option>
                          <option value="SEMESTER">Semestre</option>
                          <option value="CUSTOM">Autre</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Debut</span>
                        <input
                          disabled={gradesSaving}
                          type="date"
                          value={periodForm.startsAt}
                          onChange={(event) =>
                            setPeriodForm({ ...periodForm, startsAt: event.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Fin</span>
                        <input
                          disabled={gradesSaving}
                          type="date"
                          value={periodForm.endsAt}
                          onChange={(event) =>
                            setPeriodForm({ ...periodForm, endsAt: event.target.value })
                          }
                        />
                      </label>
                      <button className="primary-button field full" disabled={gradesSaving} type="submit">
                        {gradesSaving ? <Loader2 size={17} /> : <Plus size={17} />}
                        Ajouter la periode
                      </button>
                    </form>
                  </div>

                  <div className="settings-block">
                    <div className="section-title">
                      <strong>Classe et evaluation</strong>
                      <span>{gradesOverview.students.length} eleve(s)</span>
                    </div>
                    <div className="setup-form">
                      <label className="field">
                        <span className="required">Classe</span>
                        <select
                          disabled={gradesSaving}
                          value={gradeClassId}
                          onChange={(event) => {
                            setGradeAssessmentId("");
                            setAssessmentForm({ ...assessmentForm, classSubjectId: "" });
                            setGradeClassId(event.target.value);
                          }}
                        >
                          {gradesOverview.classes.map((schoolClass) => (
                            <option key={schoolClass.id} value={schoolClass.id}>
                              {schoolClass.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span className="required">Periode</span>
                        <select
                          disabled={gradesSaving || !gradesOverview.periods.length}
                          value={gradePeriodId}
                          onChange={(event) => {
                            setGradeAssessmentId("");
                            setGradePeriodId(event.target.value);
                          }}
                        >
                          <option value="">
                            {gradesOverview.periods.length ? "Choisir une periode" : "Creer une periode"}
                          </option>
                          {gradesOverview.periods.map((period) => (
                            <option key={period.id} value={period.id}>
                              {period.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <form className="setup-form grade-assessment-form" onSubmit={handleCreateAssessment}>
                      <label className="field">
                        <span className="required">Matiere</span>
                        <select
                          disabled={gradesSaving || !gradeClassSubjects.length}
                          required
                          value={assessmentForm.classSubjectId}
                          onChange={(event) =>
                            setAssessmentForm({
                              ...assessmentForm,
                              classSubjectId: event.target.value
                            })
                          }
                        >
                          <option value="">
                            {gradeClassSubjects.length
                              ? "Choisir une matiere"
                              : "Affecter une matiere a cette classe"}
                          </option>
                          {gradeClassSubjects.map((classSubject) => (
                            <option key={classSubject.id} value={classSubject.id}>
                              {classSubject.subject.name}
                              {classSubject.teacher
                                ? ` - ${classSubject.teacher.lastName} ${classSubject.teacher.firstName}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span className="required">Evaluation</span>
                        <input
                          disabled={gradesSaving}
                          minLength={2}
                          placeholder="Exemple : Devoir 1"
                          required
                          value={assessmentForm.name}
                          onChange={(event) =>
                            setAssessmentForm({ ...assessmentForm, name: event.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span className="required">Bareme</span>
                        <input
                          disabled={gradesSaving}
                          min={1}
                          required
                          step="0.25"
                          type="number"
                          value={assessmentForm.maxScore}
                          onChange={(event) =>
                            setAssessmentForm({ ...assessmentForm, maxScore: event.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Coefficient eval.</span>
                        <input
                          disabled={gradesSaving}
                          min={0}
                          step="0.25"
                          type="number"
                          value={assessmentForm.weight}
                          onChange={(event) =>
                            setAssessmentForm({ ...assessmentForm, weight: event.target.value })
                          }
                        />
                      </label>
                      <button
                        className="primary-button field full"
                        disabled={gradesSaving || !gradePeriodId || !gradeClassSubjects.length}
                        type="submit"
                      >
                        {gradesSaving ? <Loader2 size={17} /> : <Plus size={17} />}
                        Creer l'evaluation
                      </button>
                    </form>

                    <div className="report-card-actions" style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
                      <button
                        className="ghost-button field full"
                        disabled={reportCardLoading || !gradePeriodId || !gradeClassId}
                        type="button"
                        onClick={() => printReportCards(gradePeriodId, gradeClassId)}
                      >
                        {reportCardLoading ? <Loader2 size={17} /> : <FileText size={17} />}
                        Imprimer les bulletins de la classe
                      </button>
                    </div>
                  </div>

                  <div className="settings-block">
                    <div className="section-title">
                      <strong>Saisie des notes</strong>
                      <span>{selectedGradePeriod?.name ?? "Periode requise"}</span>
                    </div>
                    <label className="field full">
                      <span className="required">Evaluation active</span>
                      <select
                        disabled={gradesSaving || !gradesOverview.assessments.length}
                        value={gradeAssessmentId}
                        onChange={(event) => setGradeAssessmentId(event.target.value)}
                      >
                        <option value="">
                          {gradesOverview.assessments.length
                            ? "Choisir une evaluation"
                            : "Creer une evaluation"}
                        </option>
                        {gradesOverview.assessments.map((assessment) => (
                          <option key={assessment.id} value={assessment.id}>
                            {assessment.classSubject.subject.name} - {assessment.name} / {assessment.maxScore}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedGradeAssessment ? (
                      <form onSubmit={handleSaveGrades}>
                        <div className="student-table-wrap grade-table-wrap">
                          {gradesOverview.students.length ? (
                            <table className="student-table grade-table">
                              <thead>
                                <tr>
                                  <th>Matricule</th>
                                  <th>Eleve</th>
                                  <th>Note / {selectedGradeAssessment.maxScore}</th>
                                  <th>Observation</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gradesOverview.students.map((student) => {
                                  const entry = gradeEntries[student.id] ?? { score: "", comment: "" };
                                  return (
                                    <tr key={student.id}>
                                      <td>
                                        <strong>{student.matricule}</strong>
                                      </td>
                                      <td>
                                        <strong>
                                          {student.lastName} {student.firstName}
                                        </strong>
                                        <span>{selectedGradeClass?.name ?? ""}</span>
                                      </td>
                                      <td>
                                        <input
                                          className="grade-score-input"
                                          disabled={gradesSaving}
                                          max={selectedGradeAssessment.maxScore}
                                          min={0}
                                          step="0.25"
                                          type="number"
                                          value={entry.score}
                                          onChange={(event) =>
                                            setGradeEntries({
                                              ...gradeEntries,
                                              [student.id]: {
                                                ...entry,
                                                score: event.target.value
                                              }
                                            })
                                          }
                                        />
                                      </td>
                                      <td>
                                        <input
                                          disabled={gradesSaving}
                                          placeholder="Observation"
                                          value={entry.comment}
                                          onChange={(event) =>
                                            setGradeEntries({
                                              ...gradeEntries,
                                              [student.id]: {
                                                ...entry,
                                                comment: event.target.value
                                              }
                                            })
                                          }
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="empty-state compact">Aucun eleve inscrit dans cette classe.</div>
                          )}
                        </div>
                        <button
                          className="primary-button grade-save-button"
                          disabled={gradesSaving || !gradesOverview.students.length}
                          type="submit"
                        >
                          {gradesSaving ? <Loader2 size={17} /> : <Save size={17} />}
                          Enregistrer les notes
                        </button>
                      </form>
                    ) : (
                      <div className="empty-state compact">Creer ou choisir une evaluation pour saisir les notes.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-state">Aucune donnee de notes chargee.</div>
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
                {moduleCards
                  .filter((module) => !selected || module.codes.some((code) => isModuleEnabled(selected, code)))
                  .map((module) => (
                  <div className="module-card" key={module.title}>
                    <strong>{module.title}</strong>
                    <span>{module.detail}</span>
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

            {activeView === "imports" ? (
              <div className="panel animate-fade-in">
                <div className="panel-header">
                  <div>
                    <h2>Importation de données</h2>
                    <span>Importer des élèves à partir d'un fichier CSV</span>
                  </div>
                  <FileSpreadsheet size={20} />
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

                <div className="grades-workspace">
                  <div className="settings-block">
                    <div className="section-title">
                      <strong>Charger un fichier CSV</strong>
                      <span>Année scolaire active : {activeYear?.name ?? "Aucune"}</span>
                    </div>

                    <div className="setup-form">
                      <label className="field">
                        <span>Classe d'affectation globale (Optionnel)</span>
                        <select
                          disabled={importSaving}
                          value={importClassId}
                          onChange={(e) => setImportClassId(e.target.value)}
                        >
                          <option value="">-- Utiliser la colonne classe du CSV --</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <small>Si sélectionné, tous les élèves importés seront inscrits dans cette classe.</small>
                      </label>

                      <label className="field">
                        <span className="required">Fichier CSV (.csv)</span>
                        <input
                          type="file"
                          accept=".csv"
                          disabled={importSaving}
                          onChange={handleCsvFileChange}
                          style={{ padding: "8px", border: "1px dashed var(--line)", borderRadius: "6px" }}
                        />
                        <small>Utiliser le codage UTF-8. Délimiteur "," ou ";".</small>
                      </label>
                    </div>
                  </div>

                  {csvHeaders.length > 0 && (
                    <form onSubmit={handleStartImport} className="settings-block">
                      <div className="section-title">
                        <strong>Correspondance des colonnes (Mapping)</strong>
                        <span>Associer les champs élèves aux colonnes de votre fichier</span>
                      </div>

                      <div className="setup-form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <label className="field">
                          <span className="required">Nom de l'élève</span>
                          <select
                            required
                            value={importMapping.lastName}
                            onChange={(e) => setImportMapping({ ...importMapping, lastName: e.target.value })}
                          >
                            <option value="">-- Choisir une colonne --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>

                        <label className="field">
                          <span className="required">Prénom de l'élève</span>
                          <select
                            required
                            value={importMapping.firstName}
                            onChange={(e) => setImportMapping({ ...importMapping, firstName: e.target.value })}
                          >
                            <option value="">-- Choisir une colonne --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>

                        <label className="field">
                          <span>Genre (M ou F)</span>
                          <select
                            value={importMapping.gender}
                            onChange={(e) => setImportMapping({ ...importMapping, gender: e.target.value })}
                          >
                            <option value="">-- Aucune (Optionnel) --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>

                        <label className="field">
                          <span>Date de naissance</span>
                          <select
                            value={importMapping.birthDate}
                            onChange={(e) => setImportMapping({ ...importMapping, birthDate: e.target.value })}
                          >
                            <option value="">-- Aucune (Optionnel) --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>

                        <label className="field">
                          <span>Matricule</span>
                          <select
                            value={importMapping.matricule}
                            onChange={(e) => setImportMapping({ ...importMapping, matricule: e.target.value })}
                          >
                            <option value="">-- Auto-généré (Conseillé) --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>

                        {!importClassId && (
                          <label className="field">
                            <span className="required">Colonne Classe</span>
                            <select
                              required
                              value={importMapping.className}
                              onChange={(e) => setImportMapping({ ...importMapping, className: e.target.value })}
                            >
                              <option value="">-- Choisir la colonne contenant le nom de la classe --</option>
                              {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </label>
                        )}
                      </div>

                      <div style={{ marginTop: "20px" }}>
                        <div className="section-title">
                          <strong>Prévisualisation des données ({csvRows.length} lignes)</strong>
                        </div>
                        <div className="student-table-wrap" style={{ maxHeight: "250px", overflowY: "auto" }}>
                          <table className="student-table">
                            <thead>
                              <tr>
                                {csvHeaders.map(h => <th key={h}>{h}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {csvRows.slice(0, 5).map((row, idx) => (
                                <tr key={idx}>
                                  {csvHeaders.map(h => <td key={h}>{row[h]}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {csvRows.length > 5 && <div style={{ textAlign: "center", padding: "8px", fontSize: "12px", color: "var(--text-muted)" }}>... et {csvRows.length - 5} autres lignes.</div>}
                        </div>
                      </div>

                      <button
                        className="primary-button field full"
                        disabled={importSaving || !importMapping.lastName || !importMapping.firstName}
                        type="submit"
                        style={{ marginTop: "16px" }}
                      >
                        {importSaving ? <Loader2 size={17} /> : <CloudUpload size={17} />}
                        Lancer l'importation de {csvRows.length} élèves
                      </button>
                    </form>
                  )}

                  <div className="settings-block">
                    <div className="section-title">
                      <strong>Historique des importations</strong>
                      <span>{importJobs.length} job(s) enregistré(s)</span>
                    </div>

                    {importJobs.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                        {importJobs.map((job) => (
                          <div
                            key={job.id}
                            style={{
                              border: "1px solid var(--line)",
                              borderRadius: "8px",
                              padding: "16px",
                              background: "var(--background-card)"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <strong>{job.fileName}</strong>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  background:
                                    job.status === "success"
                                      ? "#d1fae5"
                                      : job.status === "completed_with_errors"
                                      ? "#fef3c7"
                                      : "#fee2e2",
                                  color:
                                    job.status === "success"
                                      ? "#065f46"
                                      : job.status === "completed_with_errors"
                                      ? "#92400e"
                                      : "#991b1b"
                                }}
                              >
                                {job.status.toUpperCase().replace(/_/g, " ")}
                              </span>
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", gap: "16px" }}>
                              <span>Lignes : <strong>{job.totalRows}</strong></span>
                              <span>Succès : <strong style={{ color: "#10b981" }}>{job.validRows}</strong></span>
                              <span>Échecs : <strong style={{ color: "#ef4444" }}>{job.errorRows}</strong></span>
                              <span>Le : <strong>{new Date(job.startedAt).toLocaleString("fr-FR")}</strong></span>
                            </div>
                            {job.errors && job.errors.length > 0 && (
                              <div style={{ marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#b91c1c" }}>Détails des erreurs :</span>
                                <div style={{ maxHeight: "150px", overflowY: "auto", marginTop: "6px", fontSize: "11px" }}>
                                  {job.errors.map((err) => (
                                    <div key={err.id} style={{ padding: "4px 0", borderBottom: "1px dashed var(--line)", color: "#991b1b" }}>
                                      Ligne {err.rowNumber} : champ <strong>{err.field}</strong> - {err.message}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state compact">Aucun historique d'importation disponible.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activeView === "backups" ? (() => {
              const filteredBackups = backups.filter((job) => {
                if (backupFilter !== "ALL" && job.status !== backupFilter) return false;
                if (backupSearch) {
                  const q = backupSearch.toLowerCase();
                  const dateStr = new Date(job.startedAt).toLocaleString("fr-FR").toLowerCase();
                  return dateStr.includes(q) || job.type.toLowerCase().includes(q) || (job.checksum || "").toLowerCase().includes(q);
                }
                return true;
              });
              const successCount = backups.filter(b => b.status === "SUCCESS").length;
              const failedCount = backups.filter(b => b.status === "FAILED").length;

              return (
              <div className="panel animate-fade-in">
                <div className="panel-header">
                  <div>
                    <h2>Sauvegardes de données</h2>
                    <span>Historique, restauration et génération des archives</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      className="ghost-button"
                      disabled={backupSaving || !selected}
                      onClick={() => selected && loadBackups(selected.id)}
                      title="Actualiser la liste"
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", height: "auto", fontSize: "12px" }}
                      type="button"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      className="primary-button"
                      disabled={backupSaving || !selected}
                      type="button"
                      onClick={() => void handleStartBackup()}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", height: "auto", fontSize: "12px" }}
                    >
                      {backupSaving ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
                      Nouvelle sauvegarde
                    </button>
                  </div>
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

                {/* Barre de filtres */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", padding: "12px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--background-card)", border: "1px solid var(--line)", borderRadius: "6px", padding: "4px 10px", flex: "1", minWidth: "180px", maxWidth: "300px" }}>
                    <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Rechercher par date..."
                      value={backupSearch}
                      onChange={(e) => setBackupSearch(e.target.value)}
                      style={{ border: "none", outline: "none", background: "transparent", fontSize: "12px", width: "100%", padding: "4px 0" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {(["ALL", "SUCCESS", "FAILED"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setBackupFilter(f)}
                        style={{
                          padding: "4px 10px", fontSize: "11px", borderRadius: "14px", border: "1px solid var(--line)", cursor: "pointer",
                          background: backupFilter === f ? (f === "SUCCESS" ? "#d1fae5" : f === "FAILED" ? "#fee2e2" : "var(--primary)") : "transparent",
                          color: backupFilter === f ? (f === "SUCCESS" ? "#065f46" : f === "FAILED" ? "#991b1b" : "white") : "var(--text-muted)",
                          fontWeight: backupFilter === f ? 600 : 400
                        }}
                      >
                        {f === "ALL" ? `Tout (${backups.length})` : f === "SUCCESS" ? `Réussi (${successCount})` : `Échoué (${failedCount})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tableau compact */}
                {filteredBackups.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table" style={{ fontSize: "12px", width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "22%" }}>Date</th>
                          <th style={{ width: "10%" }}>Statut</th>
                          <th style={{ width: "10%" }}>Taille</th>
                          <th style={{ width: "10%" }}>Type</th>
                          <th style={{ width: "8%" }}>Chiffré</th>
                          <th style={{ width: "20%" }}>Checksum</th>
                          <th style={{ width: "20%", textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBackups.map((job) => (
                          <tr key={job.id} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: "8px 6px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Database size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                <span>{new Date(job.startedAt).toLocaleString("fr-FR")}</span>
                              </div>
                            </td>
                            <td style={{ padding: "8px 6px" }}>
                              <span style={{
                                fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px",
                                background: job.status === "SUCCESS" ? "#d1fae5" : job.status === "FAILED" ? "#fee2e2" : "#fef3c7",
                                color: job.status === "SUCCESS" ? "#065f46" : job.status === "FAILED" ? "#991b1b" : "#92400e"
                              }}>
                                {job.status === "SUCCESS" ? "Réussi" : job.status === "FAILED" ? "Échoué" : job.status}
                              </span>
                            </td>
                            <td style={{ padding: "8px 6px" }}>
                              {job.sizeBytes ? (Number(job.sizeBytes) / 1024 / 1024).toFixed(2) + " MB" : "-"}
                            </td>
                            <td style={{ padding: "8px 6px", textTransform: "capitalize" }}>{job.type}</td>
                            <td style={{ padding: "8px 6px" }}>
                              {job.encrypted ? (
                                <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: "3px" }}>
                                  <ShieldCheck size={12} /> Oui
                                </span>
                              ) : "Non"}
                            </td>
                            <td style={{ padding: "8px 6px", fontFamily: "monospace", fontSize: "10px", color: "var(--text-muted)" }}>
                              {job.checksum ? job.checksum.slice(0, 16) + "..." : "-"}
                            </td>
                            <td style={{ padding: "8px 6px", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                                {job.status === "SUCCESS" && job.localPath ? (
                                  <>
                                    <a
                                      href={backupDownloadUrl(selected!.id, job.id)}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Télécharger"
                                      style={{
                                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                                        width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--line)",
                                        color: "var(--primary)", textDecoration: "none", background: "transparent"
                                      }}
                                    >
                                      <Download size={13} />
                                    </a>
                                    <button
                                      type="button"
                                      title="Restaurer cette sauvegarde"
                                      disabled={restoringBackupId !== null}
                                      onClick={() => void handleRestoreBackup(job.id)}
                                      style={{
                                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                                        width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #d1fae5",
                                        color: "#16a34a", cursor: "pointer", background: restoringBackupId === job.id ? "#d1fae5" : "transparent"
                                      }}
                                    >
                                      {restoringBackupId === job.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                                    </button>
                                  </>
                                ) : null}
                                <button
                                  type="button"
                                  title="Supprimer"
                                  onClick={() => void handleDeleteBackup(job.id)}
                                  style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #fee2e2",
                                    color: "#dc2626", cursor: "pointer", background: "transparent"
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state compact">
                    {backups.length === 0 ? "Aucune sauvegarde trouvée." : "Aucune sauvegarde ne correspond aux filtres."}
                  </div>
                )}

                {/* Messages d'erreur des sauvegardes échouées (collapsible) */}
                {filteredBackups.some(j => j.errorMessage) ? (
                  <details style={{ marginTop: "12px", fontSize: "12px" }}>
                    <summary style={{ cursor: "pointer", color: "#991b1b", fontWeight: 600 }}>
                      Voir les erreurs ({filteredBackups.filter(j => j.errorMessage).length})
                    </summary>
                    <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {filteredBackups.filter(j => j.errorMessage).map(j => (
                        <div key={j.id} style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: "6px", color: "#991b1b", fontSize: "11px" }}>
                          <strong>{new Date(j.startedAt).toLocaleString("fr-FR")} :</strong> {j.errorMessage}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
              );
            })() : null}

            {activeView === "roles" ? (
              <div className="panel animate-fade-in">
                <div className="panel-header">
                  <div>
                    <h2>Gestion des comptes</h2>
                    <span>Comptes utilisateurs locaux de l'établissement et personnalisation des droits</span>
                  </div>
                  <ShieldCheck size={20} />
                </div>

                <div className="segmented-tabs" role="tablist" aria-label="Gestion des comptes et rôles">
                  <button
                    className={rolesSubTab === "users" ? "active" : ""}
                    type="button"
                    onClick={() => setRolesSubTab("users")}
                  >
                    Utilisateurs
                  </button>
                  <button
                    className={rolesSubTab === "permissions" ? "active" : ""}
                    type="button"
                    onClick={() => setRolesSubTab("permissions")}
                  >
                    Droits et Rôles
                  </button>
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

                {rolesSubTab === "users" ? (
                  <div className="grades-workspace animate-fade-in">
                    <form className="settings-block" onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                      <div className="section-title">
                        <strong>{editingUser ? "Modifier le compte" : "Nouveau compte utilisateur"}</strong>
                        <span>Définir l'accès et le rôle associé</span>
                      </div>
                      <div className="setup-form">
                        <label className="field full">
                          <span className="required">Nom complet</span>
                          <input
                            required
                            minLength={2}
                            placeholder="Exemple : Jean Ouédraogo"
                            value={userForm.fullName}
                            onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                            disabled={userSaving}
                          />
                        </label>

                        <label className="field">
                          <span className="required">Adresse email</span>
                          <input
                            required
                            type="email"
                            placeholder="jean.o@schoolsaas.bf"
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            disabled={userSaving || editingUser !== null}
                          />
                        </label>

                        <label className="field">
                          <span>Téléphone</span>
                          <input
                            placeholder="70123456"
                            value={userForm.phone}
                            onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                            disabled={userSaving}
                          />
                        </label>

                        <label className="field">
                          <span className="required">Rôle</span>
                          <select
                            required
                            value={userForm.roleId}
                            onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                            disabled={userSaving}
                          >
                            <option value="">-- Choisir un rôle --</option>
                            {rolesList.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="field">
                          <span className={editingUser ? undefined : "required"}>
                            {editingUser ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
                          </span>
                          <input
                            required={!editingUser}
                            type="password"
                            placeholder={editingUser ? "Laisser vide pour ne pas modifier" : "••••••••"}
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            disabled={userSaving}
                          />
                        </label>

                        <div className="field full" style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                          <button className="primary-button" disabled={userSaving} type="submit">
                            {userSaving ? <Loader2 size={17} /> : <Save size={17} />}
                            {editingUser ? "Enregistrer" : "Créer le compte"}
                          </button>
                          {editingUser && (
                            <button
                              className="ghost-button"
                              type="button"
                              onClick={() => {
                                setEditingUser(null);
                                setUserForm({ fullName: "", email: "", password: "", phone: "", roleId: "" });
                              }}
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </div>
                    </form>

                    <div className="settings-block">
                      <div className="section-title">
                        <strong>Comptes existants</strong>
                        <span>{usersList.length} utilisateur(s)</span>
                      </div>
                      <div className="student-table-wrap">
                        {usersList.length > 0 ? (
                          <table className="student-table">
                            <thead>
                              <tr>
                                <th>Nom complet</th>
                                <th>Email / Rôle</th>
                                <th>Statut</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usersList.map((u) => (
                                <tr key={u.id}>
                                  <td>
                                    <strong>{u.fullName}</strong>
                                    <span>{u.phone ?? "Aucun numéro"}</span>
                                  </td>
                                  <td>
                                    <strong>{u.email}</strong>
                                    <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: "bold" }}>
                                      {u.roleName}
                                    </span>
                                  </td>
                                  <td>
                                    <span
                                      className={`status-badge ${u.status === "active" ? "active" : "suspended"}`}
                                    >
                                      {u.status === "active" ? "Actif" : "Inactif"}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                                      <button
                                        className="ghost-button small"
                                        type="button"
                                        onClick={() => startEditUser(u)}
                                      >
                                        Modifier
                                      </button>
                                      {u.status === "active" && (
                                        <button
                                          className="ghost-button small danger-button"
                                          type="button"
                                          onClick={() => void handleDeleteUser(u.id)}
                                        >
                                          Désactiver
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="empty-state compact">Aucun compte utilisateur trouvé.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="roles-permissions-view animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div className="settings-block" style={{ width: "100%" }}>
                      <div className="section-title">
                        <strong>Sélectionner un rôle à personnaliser</strong>
                        <span>Les modifications s'appliqueront à tous les utilisateurs ayant ce rôle.</span>
                      </div>
                      
                      <div className="setup-form" style={{ maxWidth: "400px" }}>
                        <label className="field full">
                          <span className="required">Rôle à configurer</span>
                          <select
                            value={selectedRoleForPermissions?.id || ""}
                            onChange={(e) => handleSelectRoleForPermissions(e.target.value)}
                          >
                            <option value="">-- Choisir un rôle --</option>
                            {rolesList.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    {selectedRoleForPermissions ? (
                      selectedRoleForPermissions.code === "establishment_admin" ? (
                        <div className="settings-block">
                          <div className="alert-item" style={{ background: "var(--background)", color: "var(--text)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", gap: "12px", alignItems: "center" }}>
                            <ShieldCheck size={24} style={{ color: "var(--success)" }} />
                            <div>
                              <strong style={{ display: "block", marginBottom: "4px" }}>Rôle Administrateur Système</strong>
                              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                                Le rôle Administrateur Établissement possède toutes les permissions de la plateforme par défaut. Ses droits ne peuvent pas être restreints pour éviter de bloquer l'administration de l'établissement.
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="settings-block" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                          <div className="section-title" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "12px" }}>
                              <div>
                                <strong>Permissions pour le rôle : {selectedRoleForPermissions.name}</strong>
                                <span>Cochez les modules et actions autorisés pour ce rôle</span>
                              </div>
                              <button
                                className="primary-button"
                                type="button"
                                disabled={permissionsSaving}
                                onClick={handleSaveRolePermissions}
                              >
                                {permissionsSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                                Enregistrer les droits
                              </button>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {PERMISSION_GROUPS.map((group) => (
                              <div key={group.category} style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: "16px" }}>
                                <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "var(--text)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)" }}></span>
                                  {group.category}
                                </h3>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                                  {group.permissions.map((perm) => {
                                    const isChecked = selectedPermissions.includes(perm.code);
                                    return (
                                      <label
                                        key={perm.code}
                                        style={{
                                          display: "flex",
                                          gap: "10px",
                                          padding: "10px 12px",
                                          borderRadius: "6px",
                                          border: `1px solid ${isChecked ? "var(--primary)" : "var(--border)"}`,
                                          background: isChecked ? "rgba(15, 23, 42, 0.03)" : "var(--background)",
                                          cursor: "pointer",
                                          transition: "all 0.2s"
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleTogglePermission(perm.code)}
                                          style={{ marginTop: "3px" }}
                                        />
                                        <div>
                                          <strong style={{ display: "block", fontSize: "13px", color: "var(--text)" }}>{perm.label}</strong>
                                          <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", lineHeight: "1.4" }}>
                                            {perm.description}
                                          </span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                            <button
                              className="primary-button"
                              type="button"
                              disabled={permissionsSaving}
                              onClick={handleSaveRolePermissions}
                            >
                              {permissionsSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                              Enregistrer les droits
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="empty-state">
                        Sélectionnez un rôle ci-dessus pour personnaliser ses droits d'accès.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {activeView === "super-admin" && currentUser.roleCode === "platform_super_admin" ? (
              <SuperAdminPanel
                establishments={establishments}
                currentUser={currentUser}
                onRefresh={() => void loadEstablishments()}
              />
            ) : null}

            {activeView === "audit-logs" ? (
              <AuditLogsPanel
                currentUser={currentUser}
                selectedEstablishmentId={currentUser.roleCode === "platform_super_admin" ? undefined : selectedId}
              />
            ) : null}

            {activeView !== "dashboard" &&
            activeView !== "settings" &&
            activeView !== "structure" &&
            activeView !== "students" &&
            activeView !== "documents" &&
            activeView !== "teachers" &&
            activeView !== "payments" &&
            activeView !== "grades" &&
            activeView !== "imports" &&
            activeView !== "backups" &&
            activeView !== "roles" &&
            activeView !== "super-admin" &&
            activeView !== "audit-logs" ? (
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

      {showPasswordModal ? (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: "16px"
        }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            width: "100%", maxWidth: "420px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "hidden"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
              padding: "20px 24px", color: "white",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>Sécurité du compte</h3>
                <span style={{ fontSize: "11px", color: "#c7d2fe" }}>Changement de mot de passe</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                style={{ background: "none", border: "none", color: "#c7d2fe", cursor: "pointer", fontSize: "22px", fontWeight: "bold" }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSelfChangePassword} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {pwError && (
                <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div style={{ padding: "10px 14px", background: "#ecfdf5", border: "1px solid #d1fae5", color: "#065f46", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>
                  {pwSuccess}
                </div>
              )}

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                <span className="required">Mot de passe actuel</span>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "1.5px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: 600,
                    outline: "none"
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                <span className="required">Nouveau mot de passe</span>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "1.5px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: 600,
                    outline: "none"
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                <span className="required">Confirmer le nouveau mot de passe</span>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "1.5px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: 600,
                    outline: "none"
                  }}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={{
                    height: "38px",
                    padding: "0 16px",
                    borderRadius: "6px",
                    border: "1.5px solid #cbd5e1",
                    background: "#f1f5f9",
                    color: "#334155",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pwSaving}
                  style={{
                    height: "38px",
                    padding: "0 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#15803d",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {pwSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
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

function BrandAssetUploader({
  assetUrl,
  detail,
  disabled,
  saving,
  title,
  onUpload
}: {
  assetUrl?: string | null;
  detail: string;
  disabled: boolean;
  saving: boolean;
  title: string;
  onUpload: (file: File) => void;
}) {
  const imageUrl = apiFileUrl(assetUrl);
  const initials = title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="identity-asset">
      <div className="asset-preview" aria-hidden="true">
        {imageUrl ? (
          <img alt="" src={imageUrl} />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className="asset-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
        <small>{imageUrl ? "Image configuree" : "Aucune image configuree"}</small>
      </div>
      <label className={`ghost-button asset-upload-button ${disabled || saving ? "disabled" : ""}`}>
        {saving ? <Loader2 size={16} /> : <CloudUpload size={16} />}
        {imageUrl ? "Changer" : "Ajouter"}
        <input
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || saving}
          type="file"
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (file) {
              onUpload(file);
              input.value = "";
            }
          }}
        />
      </label>
    </div>
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
      "dashboard" | "settings" | "structure" | "students" | "documents" | "teachers" | "payments"
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
    },
    "audit-logs": {
      title: "Journal d'activite",
      detail: "Historique des actions sur la plateforme"
    },
    "super-admin": {
      title: "Gestion globale",
      detail: "Administration Super Admin"
    }
  };

  const content =
    labels[
      view as Exclude<
        AppView,
        "dashboard" | "settings" | "structure" | "students" | "documents" | "teachers" | "payments"
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

// ═══════════════════════════════════════════════════════════════════════
// COMPOSANT SUPER ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════
function SuperAdminPanel({
  establishments,
  currentUser,
  onRefresh
}: {
  establishments: Establishment[];
  currentUser: AuthUser;
  onRefresh: () => void;
}) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "establishments" | "licenses" | "modules" | "accounts">("overview");
  const [selectedEstab, setSelectedEstab] = useState<Establishment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState<string>("");
  const [licenseForm, setLicenseForm] = useState({
    planCode: "",
    status: "",
    expiresAt: "",
    maxStudents: "",
    durationMonths: ""
  });

  // États pour la création de compte admin d'établissement
  const [accountEstabId, setAccountEstabId] = useState("");
  const [accountForm, setAccountForm] = useState({ fullName: "", email: "", password: "", phone: "" });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountUsers, setAccountUsers] = useState<any[]>([]);
  const [accountRoles, setAccountRoles] = useState<any[]>([]);
  const [accountRoleId, setAccountRoleId] = useState("");

  useEffect(() => {
    void loadStats();
  }, []);

  useEffect(() => {
    if (!selectedEstab) {
      return;
    }

    const refreshed = establishments.find((establishment) => establishment.id === selectedEstab.id);
    if (refreshed && refreshed !== selectedEstab) {
      setSelectedEstab(refreshed);
    }
  }, [establishments, selectedEstab?.id]);

  function fillLicenseForm(establishment: Establishment | null) {
    const license = establishment?.licenses?.[0];
    setLicenseForm({
      planCode: license?.planCode ?? "",
      status: license?.status ?? "",
      expiresAt: toDateInput(license?.expiresAt),
      maxStudents: license?.maxStudents ? String(license.maxStudents) : "",
      durationMonths: ""
    });
  }

  async function loadStats() {
    setLoading(true);
    try {
      const s = await getPlatformStats();
      setStats(s);
    } catch {
      setAlert("Impossible de charger les statistiques de la plateforme.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateLicense() {
    if (!selectedEstab) return;
    const durationMonths = licenseForm.durationMonths ? parseInt(licenseForm.durationMonths, 10) : undefined;
    const maxStudents = licenseForm.maxStudents ? parseInt(licenseForm.maxStudents, 10) : undefined;
    setActionLoading(true);
    try {
      const updated = await updateEstablishmentLicense(selectedEstab.id, {
        planCode: licenseForm.planCode || undefined,
        status: licenseForm.status || undefined,
        expiresAt: licenseForm.expiresAt || undefined,
        maxStudents,
        durationMonths
      });
      setSelectedEstab(updated);
      fillLicenseForm(updated);
      setAlert("✅ Licence mise à jour avec succès.");
      onRefresh();
      void loadStats();
    } catch {
      setAlert("❌ Erreur lors de la mise à jour de la licence.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateStatus(establishmentId: string, status: string) {
    setActionLoading(true);
    try {
      await updateEstablishmentStatus(establishmentId, status, "Action Super Admin");
      setAlert(`✅ Statut mis à jour : ${status}`);
      onRefresh();
    } catch {
      setAlert("❌ Erreur lors de la mise à jour du statut.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleModule(establishmentId: string, moduleCode: string, enabled: boolean) {
    setActionLoading(true);
    try {
      const updated = await toggleEstablishmentModule(establishmentId, moduleCode, enabled);
      setSelectedEstab(updated);
      setAlert(`✅ Module ${moduleCode} ${enabled ? "activé" : "désactivé"}.`);
      onRefresh();
    } catch {
      setAlert("❌ Erreur lors de la modification du module.");
    } finally {
      setActionLoading(false);
    }
  }

  const licenseStatusColor = (status: string) => {
    if (status === "ACTIVE") return { bg: "#d1fae5", color: "#065f46" };
    if (status === "TRIAL") return { bg: "#fef3c7", color: "#92400e" };
    if (status === "EXPIRED") return { bg: "#fee2e2", color: "#991b1b" };
    if (status === "SUSPENDED") return { bg: "#f3f4f6", color: "#374151" };
    return { bg: "#e5e7eb", color: "#6b7280" };
  };

  // Chargement des comptes d'un établissement sélectionné
  async function loadAccountsForEstab(estabId: string) {
    if (!estabId) { setAccountUsers([]); setAccountRoles([]); return; }
    try {
      const [users, roles] = await Promise.all([
        getEstablishmentUsers(estabId),
        getEstablishmentRoles(estabId)
      ]);
      setAccountUsers(users);
      setAccountRoles(roles);
      // Sélectionner le premier rôle disponible par défaut (typiquement admin)
      if (roles.length > 0 && !accountRoleId) setAccountRoleId(roles[0].id);
    } catch {
      setAccountUsers([]);
      setAccountRoles([]);
    }
  }

  async function handleCreateAccountForEstab(e: React.FormEvent) {
    e.preventDefault();
    if (!accountEstabId || !accountRoleId) {
      setAlert("❌ Sélectionnez un établissement et un rôle.");
      return;
    }
    setAccountSaving(true);
    try {
      await createEstablishmentUser(accountEstabId, {
        ...accountForm,
        roleId: accountRoleId
      });
      setAlert("✅ Compte créé avec succès ! L'utilisateur peut maintenant se connecter.");
      setAccountForm({ fullName: "", email: "", password: "", phone: "" });
      await loadAccountsForEstab(accountEstabId);
    } catch (err: any) {
      setAlert("❌ Erreur : " + (err?.message ?? "Création échouée"));
    } finally {
      setAccountSaving(false);
    }
  }

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: TrendingUp },
    { id: "establishments", label: "\u00c9tablissements", icon: Building2 },
    { id: "licenses", label: "Licences", icon: Globe },
    { id: "modules", label: "Modules", icon: Settings },
    { id: "accounts", label: "Comptes \u00c9tablissements", icon: Users }
  ] as const;

  return (
    <div className="panel animate-fade-in" style={{ minHeight: "80vh" }}>
      {/* En-tête Super Admin */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        borderRadius: "12px",
        padding: "28px 32px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Crown size={26} color="#fbbf24" />
          </div>
          <div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: "20px", fontWeight: 700 }}>Panel Super Admin</h2>
            <p style={{ color: "#a5b4fc", margin: 0, fontSize: "13px" }}>Gestion globale de la plateforme SchoolSaaS BF</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => { void loadStats(); onRefresh(); }}
            style={{
              background: "#ffffff",
              color: "#1e1b4b",
              border: "1px solid #ffffff",
              fontSize: "12px",
              fontWeight: 700,
              height: "auto",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
            }}
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      {alert ? (
        <div style={{
          padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px",
          background: alert.startsWith("✅") ? "#d1fae5" : "#fee2e2",
          color: alert.startsWith("✅") ? "#065f46" : "#991b1b",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <span>{alert}</span>
          <button type="button" onClick={() => setAlert("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>×</button>
        </div>
      ) : null}

      {/* Onglets navigation */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "2px solid var(--line)", paddingBottom: "0" }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "10px 16px", border: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: isActive ? 600 : 400,
                background: "transparent",
                color: isActive ? "var(--primary)" : "var(--text-muted)",
                borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: "-2px", transition: "all 0.15s"
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── VUE D'ENSEMBLE ── */}
      {activeTab === "overview" ? (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              <Loader2 size={28} className="animate-spin" style={{ marginBottom: 8 }} />
              <p>Chargement des statistiques...</p>
            </div>
          ) : stats ? (
            <>
              {/* KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
                {[
                  { label: "Établissements", value: stats.totalEstablishments, color: "#4f46e5", icon: Building2 },
                  { label: "Élèves totaux", value: stats.totalStudents, color: "#059669", icon: GraduationCap },
                  { label: "Utilisateurs", value: stats.totalUsers, color: "#d97706", icon: Users },
                  { label: "Sauvegardes /7j", value: stats.recentBackupsThisWeek, color: "#7c3aed", icon: Database }
                ].map(kpi => {
                  const KpiIcon = kpi.icon;
                  return (
                    <div key={kpi.label} style={{
                      background: "var(--background-card)",
                      border: "1px solid var(--line)",
                      borderRadius: "12px",
                      padding: "20px",
                      position: "relative",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        position: "absolute", top: "12px", right: "12px",
                        width: "36px", height: "36px", borderRadius: "8px",
                        background: kpi.color + "18",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <KpiIcon size={18} color={kpi.color} />
                      </div>
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.label}</p>
                      <p style={{ margin: "8px 0 0", fontSize: "28px", fontWeight: 700, color: kpi.color }}>{kpi.value.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>

              {/* Répartition licences */}
              <div style={{ background: "var(--background-card)", border: "1px solid var(--line)", borderRadius: "12px", padding: "20px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600 }}>Répartition des licences</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                  {[
                    { label: "Essai (Trial)", value: stats.licenses.trial, bg: "#fef3c7", color: "#92400e" },
                    { label: "Actives", value: stats.licenses.active, bg: "#d1fae5", color: "#065f46" },
                    { label: "Expirées", value: stats.licenses.expired, bg: "#fee2e2", color: "#991b1b" },
                    { label: "Suspendues", value: stats.licenses.suspended, bg: "#f3f4f6", color: "#374151" }
                  ].map(lic => (
                    <div key={lic.label} style={{ textAlign: "center", padding: "16px", borderRadius: "8px", background: lic.bg }}>
                      <p style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: lic.color }}>{lic.value}</p>
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: lic.color, fontWeight: 500 }}>{lic.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* ── LISTE ÉTABLISSEMENTS ── */}
      {activeTab === "establishments" ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>{establishments.length} établissement(s)</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {establishments.map(estab => {
              const license = estab.licenses?.[0];
              const licColors = licenseStatusColor(license?.status ?? "TRIAL");
              return (
                <div key={estab.id} style={{
                  background: "var(--background-card)",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "8px",
                      background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 700, fontSize: "16px", flexShrink: 0
                    }}>
                      {estab.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>{estab.name}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>
                        {estab.city ?? "Ville N/A"} · {estab.type}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {license ? (
                      <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "12px", fontWeight: 600, background: licColors.bg, color: licColors.color }}>
                        {license.planCode.toUpperCase()} · {license.status}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEstab(estab);
                        fillLicenseForm(estab);
                        setActiveTab("licenses");
                      }}
                      style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer" }}
                    >
                      Gérer licence
                    </button>
                    {license?.status !== "SUSPENDED" ? (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void handleUpdateStatus(estab.id, "SUSPENDED")}
                        style={{
                          fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
                          border: "1px solid #fee2e2", background: "transparent",
                          cursor: "pointer", color: "#dc2626",
                          display: "flex", alignItems: "center", gap: "4px"
                        }}
                      >
                        <Lock size={11} />
                        Suspendre
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void handleUpdateStatus(estab.id, "ACTIVE")}
                        style={{
                          fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
                          border: "1px solid #d1fae5", background: "transparent",
                          cursor: "pointer", color: "#059669",
                          display: "flex", alignItems: "center", gap: "4px"
                        }}
                      >
                        <Power size={11} />
                        Réactiver
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── GESTION LICENCES ── */}
      {activeTab === "licenses" ? (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025)",
            marginBottom: "24px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5" }}>
                <Building2 size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Sélection de l'établissement</h4>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>Choisissez l'école pour configurer ses droits d'accès</p>
              </div>
            </div>

            <select
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "13px",
                fontWeight: 600,
                width: "100%",
                maxWidth: "420px",
                outline: "none",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
              value={selectedEstab?.id ?? ""}
              onChange={e => {
                const found = establishments.find(es => es.id === e.target.value) ?? null;
                setSelectedEstab(found);
                fillLicenseForm(found);
              }}
            >
              <option value="">-- Sélectionner un établissement --</option>
              {establishments.map(es => (
                <option key={es.id} value={es.id}>{es.name}</option>
              ))}
            </select>
          </div>

          {selectedEstab ? (
            <div style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "28px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)",
              maxWidth: "560px",
              animation: "fadeIn 0.3s ease-out"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
                <Globe size={18} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                  Modifier la licence — {selectedEstab.name}
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  <span>Plan de souscription</span>
                  <select
                    value={licenseForm.planCode}
                    onChange={e => setLicenseForm({ ...licenseForm, planCode: e.target.value })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  >
                    <option value="">Inchangé</option>
                    <option value="trial">Trial (Démo)</option>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  <span>Statut actuel</span>
                  <select
                    value={licenseForm.status}
                    onChange={e => setLicenseForm({ ...licenseForm, status: e.target.value })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  >
                    <option value="">Inchangé</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  <span>Duree en mois</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    placeholder="Exemple : 3"
                    value={licenseForm.durationMonths}
                    onChange={e => {
                      const value = e.target.value;
                      const months = parseInt(value, 10);
                      setLicenseForm({
                        ...licenseForm,
                        durationMonths: value,
                        expiresAt: Number.isFinite(months) && months > 0 ? addMonthsInput(months) : licenseForm.expiresAt
                      });
                    }}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  />
                  <small style={{ color: "#64748b", fontWeight: 500 }}>Calcule automatiquement l'expiration depuis aujourd'hui.</small>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  <span>Date d'expiration</span>
                  <input
                    type="date"
                    value={licenseForm.expiresAt}
                    onChange={e => setLicenseForm({ ...licenseForm, expiresAt: e.target.value })}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  <span>Nombre max d'élèves</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="Illimité"
                    value={licenseForm.maxStudents}
                    onChange={e => setLicenseForm({ ...licenseForm, maxStudents: e.target.value })}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleUpdateLicense()}
                style={{
                  marginTop: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 24px",
                  height: "auto",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1)",
                  transition: "transform 0.1s ease"
                }}
              >
                {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Enregistrer les modifications
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── GESTION MODULES ── */}
      {activeTab === "modules" ? (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Établissement</label>
            <select
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px", width: "100%", maxWidth: "400px" }}
              value={selectedEstab?.id ?? ""}
              onChange={e => setSelectedEstab(establishments.find(es => es.id === e.target.value) ?? null)}
            >
              <option value="">-- Sélectionner un établissement --</option>
              {establishments.map(es => (
                <option key={es.id} value={es.id}>{es.name}</option>
              ))}
            </select>
          </div>

          {selectedEstab ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
              {(selectedEstab.modules ?? []).map(mod => (
                <div key={mod.moduleCode} style={{
                  background: "var(--background-card)", border: "1px solid var(--line)",
                  borderRadius: "10px", padding: "16px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: "8px"
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>{mod.moduleCode}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: mod.enabled ? "#059669" : "var(--text-muted)" }}>
                      {mod.enabled ? "Activé" : "Désactivé"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleToggleModule(selectedEstab.id, mod.moduleCode, !mod.enabled)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: mod.enabled ? "#059669" : "var(--text-muted)"
                    }}
                  >
                    {mod.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">Sélectionnez un établissement pour gérer ses modules.</div>
          )}
        </div>
      ) : null}

      {/* ── COMPTES ÉTABLISSEMENTS ── */}
      {activeTab === "accounts" ? (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025)",
            marginBottom: "24px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5" }}>
                <Building2 size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Sélection de l'établissement</h4>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>Choisissez l'école pour créer et lier des comptes administrateurs</p>
              </div>
            </div>

            <select
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "13px",
                fontWeight: 600,
                width: "100%",
                maxWidth: "420px",
                outline: "none",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
              value={accountEstabId}
              onChange={e => {
                setAccountEstabId(e.target.value);
                setAccountRoleId("");
                void loadAccountsForEstab(e.target.value);
              }}
            >
              <option value="">-- Choisir un établissement --</option>
              {establishments.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {accountEstabId ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", alignItems: "start" }}>
              {/* Formulaire de création */}
              <form onSubmit={handleCreateAccountForEstab} style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "28px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)",
                display: "flex",
                flexDirection: "column",
                gap: "18px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px", marginBottom: "4px" }}>
                  <UserPlus size={18} color="#059669" />
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>Nouveau compte utilisateur</h4>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  <span>Nom complet *</span>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Jean Ouedraogo"
                    value={accountForm.fullName}
                    onChange={e => setAccountForm({ ...accountForm, fullName: e.target.value })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  <span>Adresse email *</span>
                  <input
                    required
                    type="email"
                    placeholder="admin@etablissement.bf"
                    value={accountForm.email}
                    onChange={e => setAccountForm({ ...accountForm, email: e.target.value })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  <span>Mot de passe initial *</span>
                  <input
                    required
                    type="password"
                    placeholder="Min. 6 caractères"
                    value={accountForm.password}
                    onChange={e => setAccountForm({ ...accountForm, password: e.target.value })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  <span>Numéro de téléphone</span>
                  <input
                    type="tel"
                    placeholder="Ex: 70 12 34 56"
                    value={accountForm.phone}
                    onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  <span>Rôle d'établissement *</span>
                  <select
                    required
                    value={accountRoleId}
                    onChange={e => setAccountRoleId(e.target.value)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  >
                    <option value="">-- Choisir un rôle --</option>
                    {accountRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  {accountRoles.length === 0 && (
                    <span style={{ fontSize: "11px", color: "#d97706", marginTop: "4px", fontWeight: 500 }}>
                      ⚠️ Aucun rôle trouvé pour cet établissement. L'admin local doit d'abord créer des rôles.
                    </span>
                  )}
                </label>

                <button
                  type="submit"
                  disabled={accountSaving}
                  style={{
                    height: "40px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)",
                    marginTop: "8px"
                  }}
                >
                  {accountSaving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Créer le compte utilisateur
                </button>
              </form>

              {/* Liste des comptes existants */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "28px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)"
              }}>
                <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
                  Comptes existants ({accountUsers.length})
                </h4>
                {accountUsers.length === 0 ? (
                  <div className="empty-state compact" style={{ padding: "40px 20px" }}>
                    Aucun compte utilisateur actif pour cet établissement.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "460px", overflowY: "auto", paddingRight: "4px" }}>
                    {accountUsers.map(u => {
                      // Initiales pour l'avatar
                      const initials = u.fullName ? u.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "U";
                      return (
                        <div key={u.id} style={{
                          padding: "12px 16px",
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: 700
                            }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{u.fullName}</div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>{u.email}</div>
                              <div style={{ display: "inline-block", fontSize: "10px", fontWeight: 700, color: "#4f46e5", background: "#e0e7ff", padding: "1px 6px", borderRadius: "4px", marginTop: "2px" }}>
                                {u.roleName}
                              </div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: "10px",
                            padding: "3px 10px",
                            borderRadius: "9999px",
                            fontWeight: 700,
                            background: u.status === "ACTIVE" ? "#d1fae5" : "#fee2e2",
                            color: u.status === "ACTIVE" ? "#065f46" : "#991b1b"
                          }}>
                            {u.status === "ACTIVE" ? "Actif" : "Inactif"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "60px 20px" }}>
              <Building2 size={32} style={{ color: "#94a3b8", marginBottom: "12px" }} />
              <p>Sélectionnez un établissement ci-dessus pour gérer ses comptes d'accès.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPOSANT AUDIT LOGS PANEL
// ═══════════════════════════════════════════════════════════════════════
function AuditLogsPanel({
  currentUser,
  selectedEstablishmentId
}: {
  currentUser: AuthUser;
  selectedEstablishmentId?: string;
}) {
  const isSuperAdmin = currentUser.roleCode === "platform_super_admin";
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;
  const [actionFilter, setActionFilter] = useState("");
  const [searchEstabId, setSearchEstabId] = useState(selectedEstablishmentId ?? "");

  useEffect(() => {
    void loadLogs();
    void loadStats();
  }, [page, actionFilter, searchEstabId]);

  async function loadLogs() {
    setLoading(true);
    try {
      let result: PaginatedAuditLogs;
      if (isSuperAdmin) {
        result = await getAllAuditLogs({
          establishmentId: searchEstabId || undefined,
          action: actionFilter || undefined,
          page,
          limit
        });
      } else {
        result = await getEstablishmentAuditLogs(selectedEstablishmentId ?? "", page, limit);
      }
      setLogs(result.data);
      setTotal(result.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const s = await getAuditLogStats(isSuperAdmin ? (searchEstabId || undefined) : selectedEstablishmentId);
      setStats(s);
    } catch {
      // silencieux
    }
  }

  const actionBadgeColor = (action: string) => {
    if (action.includes("LOGIN")) return { bg: "#dbeafe", color: "#1e40af" };
    if (action.includes("CREATE")) return { bg: "#d1fae5", color: "#065f46" };
    if (action.includes("UPDATE")) return { bg: "#fef3c7", color: "#92400e" };
    if (action.includes("DELETE") || action.includes("DEACTIVATE")) return { bg: "#fee2e2", color: "#991b1b" };
    if (action.includes("BACKUP")) return { bg: "#f3e8ff", color: "#7c3aed" };
    if (action.includes("PASSWORD")) return { bg: "#fff7ed", color: "#c2410c" };
    return { bg: "#f1f5f9", color: "#475569" };
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="panel animate-fade-in">
      {/* En-tête */}
      <div className="panel-header">
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={20} />
            Journal d'activité
          </h2>
          <span>Traçabilité complète des actions sensibles sur la plateforme</span>
        </div>
      </div>

      {/* Statistiques rapides */}
      {stats ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Total", value: stats.total, color: "#4f46e5" },
            { label: "Dernières 24h", value: stats.last24h, color: "#059669" },
            { label: "Derniers 7 jours", value: stats.last7d, color: "#d97706" }
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--background-card)", border: "1px solid var(--line)",
              borderRadius: "10px", padding: "14px 16px"
            }}>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Filtres */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12px", minWidth: "180px" }}
        >
          <option value="">Toutes les actions</option>
          <option value="LOGIN">Connexions</option>
          <option value="USER_">Gestion utilisateurs</option>
          <option value="BACKUP">Sauvegardes</option>
          <option value="PASSWORD">Mots de passe</option>
        </select>

        <button
          type="button"
          className="ghost-button"
          onClick={() => { void loadLogs(); void loadStats(); }}
          style={{ height: "auto", padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
        >
          <RefreshCw size={13} />
          Actualiser
        </button>

        <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "auto" }}>
          {total} entrée(s) — page {page}/{totalPages || 1}
        </span>
      </div>

      {/* Tableau des logs */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : logs.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ fontSize: "12px", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "16%" }}>Date</th>
                <th style={{ width: "16%" }}>Action</th>
                <th style={{ width: "12%" }}>Entité</th>
                {isSuperAdmin ? <th style={{ width: "18%" }}>Établissement</th> : null}
                <th style={{ width: "20%" }}>Utilisateur</th>
                <th style={{ width: "18%" }}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const badgeColors = actionBadgeColor(log.action);
                return (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 6px", fontSize: "11px", color: "var(--text-muted)" }}>
                      {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 600, padding: "2px 8px",
                        borderRadius: "10px", background: badgeColors.bg, color: badgeColors.color,
                        whiteSpace: "nowrap"
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px", fontSize: "11px", color: "var(--text-muted)" }}>
                      {log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 6)}` : ""}
                    </td>
                    {isSuperAdmin ? (
                      <td style={{ padding: "8px 6px", fontSize: "11px" }}>
                        {log.establishment?.name ?? (log.establishmentId ? log.establishmentId.slice(0, 8) + "..." : <em style={{ color: "var(--text-muted)" }}>Plateforme</em>)}
                      </td>
                    ) : null}
                    <td style={{ padding: "8px 6px", fontSize: "11px" }}>
                      {log.user?.fullName ?? log.user?.email ?? (log.userId ? log.userId.slice(0, 8) + "..." : <em style={{ color: "var(--text-muted)" }}>Système</em>)}
                    </td>
                    <td style={{ padding: "8px 6px", fontSize: "10px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {log.reason ?? (log.newValues ? JSON.stringify(log.newValues).slice(0, 60) + "..." : "-")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state compact">Aucun log trouvé pour les filtres sélectionnés.</div>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
          <button
            type="button"
            className="ghost-button"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ height: "auto", padding: "5px 12px", fontSize: "12px" }}
          >
            ← Précédent
          </button>
          <span style={{ padding: "5px 12px", fontSize: "12px", color: "var(--text-muted)" }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="ghost-button"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ height: "auto", padding: "5px 12px", fontSize: "12px" }}
          >
            Suivant →
          </button>
        </div>
      ) : null}
    </div>
  );
}
