export const PERMISSIONS = {
  DASHBOARD_READ: "dashboard.read",
  ESTABLISHMENT_MANAGE: "establishment.manage",
  ACADEMIC_YEARS_MANAGE: "academic_years.manage",
  STUDENTS_READ: "students.read",
  STUDENTS_MANAGE: "students.manage",
  GUARDIANS_MANAGE: "guardians.manage",
  CLASSES_MANAGE: "classes.manage",
  SUBJECTS_MANAGE: "subjects.manage",
  TEACHERS_MANAGE: "teachers.manage",
  PAYMENTS_READ: "payments.read",
  PAYMENTS_MANAGE: "payments.manage",
  GRADES_READ: "grades.read",
  GRADES_ENTER: "grades.enter",
  GRADES_VALIDATE: "grades.validate",
  REPORT_CARDS_GENERATE: "report_cards.generate",
  IMPORTS_MANAGE: "imports.manage",
  BACKUPS_MANAGE: "backups.manage",
  USERS_MANAGE: "users.manage",
  AUDIT_LOGS_READ: "audit_logs.read"
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

