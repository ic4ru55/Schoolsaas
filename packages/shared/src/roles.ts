import { PERMISSIONS, PermissionCode } from "./permissions";

export const DEFAULT_ROLES = [
  {
    code: "platform_super_admin",
    label: "Super admin plateforme",
    scope: "platform"
  },
  {
    code: "establishment_admin",
    label: "Admin etablissement",
    scope: "establishment"
  },
  { code: "director", label: "Directeur", scope: "establishment" },
  { code: "accountant", label: "Comptable", scope: "establishment" },
  { code: "cashier", label: "Caissier", scope: "establishment" },
  { code: "secretary", label: "Secretaire", scope: "establishment" },
  { code: "teacher", label: "Enseignant", scope: "establishment" },
  { code: "supervisor", label: "Surveillant", scope: "establishment" },
  { code: "parent", label: "Parent", scope: "portal" },
  { code: "student", label: "Eleve ou etudiant", scope: "portal" }
] as const;

export type DefaultRoleCode = (typeof DEFAULT_ROLES)[number]["code"];

export const ROLE_PERMISSION_PRESETS: Partial<
  Record<DefaultRoleCode, PermissionCode[]>
> = {
  establishment_admin: Object.values(PERMISSIONS),
  director: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.GRADES_READ,
    PERMISSIONS.REPORT_CARDS_GENERATE,
    PERMISSIONS.AUDIT_LOGS_READ
  ],
  accountant: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_MANAGE
  ],
  cashier: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_MANAGE
  ],
  secretary: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.ESTABLISHMENT_MANAGE,
    PERMISSIONS.ACADEMIC_YEARS_MANAGE,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.STUDENTS_MANAGE,
    PERMISSIONS.GUARDIANS_MANAGE,
    PERMISSIONS.CLASSES_MANAGE,
    PERMISSIONS.SUBJECTS_MANAGE,
    PERMISSIONS.TEACHERS_MANAGE,
    PERMISSIONS.IMPORTS_MANAGE
  ],
  teacher: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.GRADES_READ,
    PERMISSIONS.GRADES_ENTER
  ],
  supervisor: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.STUDENTS_READ
  ],
  parent: [
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.GRADES_READ,
    PERMISSIONS.PAYMENTS_READ
  ],
  student: [
    PERMISSIONS.GRADES_READ,
    PERMISSIONS.PAYMENTS_READ
  ]
};
