export type EstablishmentModule = {
  id?: string;
  moduleCode: string;
  enabled: boolean;
  source?: string | null;
};

export type EstablishmentLicense = {
  id?: string;
  planCode: string;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | string;
  startsAt?: string;
  expiresAt?: string | null;
  maxStudents?: number | null;
  lastCheckAt?: string | null;
};

export type Establishment = {
  id: string;
  name: string;
  legalName?: string | null;
  type: string;
  address?: string | null;
  city?: string | null;
  country: string;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  stampUrl?: string | null;
  directorSignatureUrl?: string | null;
  cashierSignatureUrl?: string | null;
  motto?: string | null;
  currency: string;
  activeAcademicYearId?: string | null;
  studentMatriculePrefix: string;
  studentMatriculeFormat: string;
  studentMatriculeNextNumber: number;
  studentMatriculePadding: number;
  reportCardColor?: string;
  reportCardHeaderLeft?: string | null;
  reportCardHeaderCenter?: string | null;
  reportCardHeaderRight?: string | null;
  reportCardTitle?: string | null;
  reportCardSignerTitle?: string | null;
  reportCardSignerName?: string | null;
  academicYears?: AcademicYear[];
  modules?: EstablishmentModule[];
  licenses?: EstablishmentLicense[];
};

export type AcademicYear = {
  id: string;
  establishmentId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

export type Level = {
  id: string;
  establishmentId: string;
  name: string;
  code?: string | null;
  orderIndex: number;
};

export type Subject = {
  id: string;
  establishmentId: string;
  name: string;
  code?: string | null;
  subjectGroup?: string | null;
};

export type SchoolClass = {
  id: string;
  establishmentId: string;
  academicYearId: string;
  levelId?: string | null;
  mainTeacherId?: string | null;
  name: string;
  code?: string | null;
  capacity?: number | null;
  academicYear?: AcademicYear;
  level?: Level | null;
  mainTeacher?: Teacher | null;
  classSubjects?: Array<{
    id: string;
    coefficient: string | number;
    subject: Subject;
    teacher?: Teacher | null;
  }>;
};

export type Teacher = {
  id: string;
  establishmentId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  status: "active" | "inactive" | "suspended" | string;
  employmentType: "permanent" | "vacataire" | "contractuel" | "stagiaire" | string;
  hourlyRate: number;
  mainClasses?: SchoolClass[];
  classSubjects?: Array<{
    id: string;
    coefficient: string | number;
    class: SchoolClass;
    subject: Subject;
  }>;
};

export type Student = {
  id: string;
  establishmentId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  gender?: "FEMALE" | "MALE" | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  nationality?: string | null;
  status: "ACTIVE" | "TRANSFERRED" | "DROPPED_OUT" | "EXCLUDED" | "GRADUATED";
  enrollments?: Array<{
    id: string;
    academicYearId: string;
    classId: string;
    status: "ACTIVE" | "CANCELLED" | "COMPLETED";
    enrollmentType: "NEW" | "REENROLLMENT" | "TRANSFER";
    academicYear: AcademicYear;
    class: SchoolClass;
  }>;
  guardians?: Array<{
    id: string;
    relationship: string;
    isPrimary: boolean;
    guardian: {
      id: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      profession?: string | null;
    };
  }>;
  documents?: StudentDocument[];
};

export type StudentDocument = {
  id: string;
  establishmentId: string;
  studentId: string;
  documentType: string;
  label?: string | null;
  originalName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
};

export type StudentDossier = {
  student: Student & {
    photoUrl?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  guardians: Student["guardians"];
  cursus: Array<{
    id: string;
    academicYearId: string;
    academicYearName: string;
    classId: string;
    className: string;
    levelName?: string | null;
    mainTeacherName?: string | null;
    enrollmentType: "NEW" | "REENROLLMENT" | "TRANSFER";
    status: "ACTIVE" | "CANCELLED" | "COMPLETED";
    enrolledAt: string;
  }>;
  documents: StudentDocument[];
  finances: {
    totalDue: number;
    paid: number;
    balance: number;
    assignments: Array<{
      id: string;
      academicYearId: string;
      academicYearName: string;
      feeName: string;
      className?: string | null;
      levelName?: string | null;
      amountDue: number;
      paid: number;
      balance: number;
      dueDate?: string | null;
    }>;
    payments: PaymentRecord[];
  };
  pedagogy: {
    grades: Array<{
      id: string;
      score: number;
      comment?: string | null;
      validatedAt?: string | null;
      createdAt: string;
      assessmentName: string;
      maxScore: number;
      weight: number;
      periodName: string;
      academicYearId: string;
      subjectName: string;
      className: string;
      teacherName?: string | null;
    }>;
    reportCards: Array<{
      id: string;
      academicYearId: string;
      academicYearName?: string | null;
      periodId: string;
      periodName?: string | null;
      classId: string;
      className?: string | null;
      average?: number | null;
      rank?: number | null;
      decision?: string | null;
      pdfUrl?: string | null;
      generatedBy?: string | null;
      generatedAt: string;
    }>;
  };
};

export type DashboardSummary = {
  establishment: Establishment | null;
  metrics: {
    students: number;
    classes: number;
    teachers: number;
    payments: number;
  };
  backup: { status: string; startedAt: string; completedAt?: string | null } | null;
  alerts: string[];
};

export type FeeItem = {
  id: string;
  establishmentId: string;
  academicYearId: string;
  levelId?: string | null;
  classId?: string | null;
  name: string;
  amount: number;
  dueDate?: string | null;
  required: boolean;
  assignmentsCount: number;
  paidAmount: number;
  level?: Level | null;
  class?: SchoolClass | null;
};

export type StudentPaymentSummary = {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  status: string;
  className?: string | null;
  classId?: string | null;
  guardianPhone?: string | null;
  totalDue: number;
  paid: number;
  balance: number;
  assignments: Array<{
    id: string;
    feeItemId: string;
    feeName: string;
    amountDue: number;
    paid: number;
    balance: number;
    dueDate?: string | null;
  }>;
};

export type PaymentRecord = {
  id: string;
  establishmentId: string;
  studentId: string;
  academicYearId: string;
  amount: number;
  method: "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CHECK" | "OTHER";
  reference?: string | null;
  receiptNumber: string;
  paidAt: string;
  receivedBy?: string | null;
  student?: Student;
  academicYear?: AcademicYear;
  receipt?: {
    id: string;
    receiptNumber: string;
    generatedAt: string;
  } | null;
  allocations?: Array<{
    id: string;
    amount: number;
    studentFeeAssignment?: {
      id: string;
      amountDue: number;
      feeItem?: FeeItem;
    };
  }>;
};

export type PaymentsOverview = {
  establishment: Establishment;
  academicYear: AcademicYear;
  feeItems: FeeItem[];
  students: StudentPaymentSummary[];
  recentPayments: PaymentRecord[];
  totals: {
    expected: number;
    paid: number;
    balance: number;
  };
  alerts: string[];
};

export type GradePeriod = {
  id: string;
  establishmentId: string;
  academicYearId: string;
  name: string;
  type: string;
  startsAt?: string | null;
  endsAt?: string | null;
  lockedAt?: string | null;
};

export type GradeAssessment = {
  id: string;
  establishmentId: string;
  academicYearId: string;
  periodId: string;
  classSubjectId: string;
  name: string;
  maxScore: number;
  weight: number;
  lockedAt?: string | null;
  period: GradePeriod;
  classSubject: {
    id: string;
    classId: string;
    subjectId: string;
    teacherId?: string | null;
    coefficient: number;
    class: SchoolClass;
    subject: Subject;
    teacher?: Teacher | null;
  };
  grades: Array<{
    id: string;
    assessmentId: string;
    studentId: string;
    score: number;
    comment?: string | null;
    enteredBy?: string | null;
    validatedBy?: string | null;
    validatedAt?: string | null;
    student: Student;
  }>;
};

export type GradesOverview = {
  academicYear: AcademicYear;
  periods: GradePeriod[];
  classes: Array<
    SchoolClass & {
      classSubjects: Array<{
        id: string;
        classId: string;
        subjectId: string;
        teacherId?: string | null;
        coefficient: number;
        subject: Subject;
        teacher?: Teacher | null;
      }>;
    }
  >;
  selectedClassId: string;
  selectedPeriodId: string;
  students: Student[];
  assessments: GradeAssessment[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function apiPath(path: string) {
  return `${API_URL}${path}`;
}

export function apiFileUrl(path?: string | null) {
  if (!path) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path;
  }

  return apiPath(path.startsWith("/") ? path : `/${path}`);
}

function stripEmptyStrings<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== "")
  ) as Partial<T>;
}

function apiErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") {
    return fallback;
  }

  const message = (body as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.join(" ");
  }

  if (typeof message === "string") {
    if (message.toLowerCase().includes("request entity too large")) {
      return "Document trop volumineux. Choisir un fichier de 8 Mo maximum.";
    }

    return message;
  }

  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("schoolsaas_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...init?.headers as any
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(apiPath(path), {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    const fallback =
      response.status === 413
        ? "Document trop volumineux. Choisir un fichier de 8 Mo maximum."
        : `API error ${response.status}`;
    throw new Error(apiErrorMessage(body, fallback));
  }

  return response.json() as Promise<T>;
}

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  scope: "platform" | "establishment";
  establishmentId: string | null;
  roleCode: string;
  permissions: string[];
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export function login(email: string, password: string) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function getMe() {
  return request<AuthUser>("/auth/me");
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<any>("/auth/change-password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword })
  });
}


export type WebUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  status: string;
  lastLoginAt?: string | null;
  createdAt: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  userRoleId: string;
};

export type WebRole = {
  id: string;
  establishmentId?: string | null;
  code: string;
  name: string;
  permissions?: Array<{
    permission: {
      id: string;
      code: string;
      name: string;
      moduleCode: string;
    };
  }>;
};

export function getEstablishmentUsers(establishmentId: string) {
  return request<WebUser[]>(`/establishments/${establishmentId}/users`);
}

export function getEstablishmentRoles(establishmentId: string) {
  return request<WebRole[]>(`/establishments/${establishmentId}/users/roles`);
}

export function updateRolePermissions(
  establishmentId: string,
  roleId: string,
  permissionCodes: string[]
) {
  return request<{ success: boolean }>(
    `/establishments/${establishmentId}/users/roles/${roleId}/permissions`,
    {
      method: "PATCH",
      body: JSON.stringify({ permissionCodes })
    }
  );
}

export function createEstablishmentUser(
  establishmentId: string,
  input: {
    fullName: string;
    email: string;
    password?: string;
    phone?: string;
    roleId: string;
  }
) {
  return request<any>(`/establishments/${establishmentId}/users`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function updateEstablishmentUser(
  establishmentId: string,
  userId: string,
  input: {
    fullName?: string;
    phone?: string;
    roleId?: string;
    status?: string;
    newPassword?: string;
  }
) {
  return request<any>(`/establishments/${establishmentId}/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function deleteEstablishmentUser(establishmentId: string, userId: string) {
  return request<any>(`/establishments/${establishmentId}/users/${userId}`, {
    method: "DELETE"
  });
}

export function getEstablishments() {
  return request<Establishment[]>("/establishments");
}

export function createEstablishment(input: {
  name: string;
  type: string;
  city?: string;
  phone?: string;
  email?: string;
}) {
  return request<Establishment>("/establishments", {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function updateEstablishment(
  establishmentId: string,
  input: Partial<{
    name: string;
    legalName: string;
    type: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    motto: string;
    currency: string;
    studentMatriculePrefix: string;
    studentMatriculeFormat: string;
    studentMatriculeNextNumber: number;
    studentMatriculePadding: number;
    reportCardColor: string;
    reportCardHeaderLeft: string;
    reportCardHeaderCenter: string;
    reportCardHeaderRight: string;
    reportCardTitle: string;
    reportCardSignerTitle: string;
    reportCardSignerName: string;
  }>
) {
  return request<Establishment>(`/establishments/${establishmentId}`, {
    method: "PATCH",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function uploadEstablishmentAsset(
  establishmentId: string,
  input: {
    assetType: "LOGO" | "STAMP" | "DIRECTOR_SIGNATURE" | "CASHIER_SIGNATURE";
    originalName: string;
    mimeType: string;
    base64Content: string;
  }
) {
  return request<Establishment>(`/establishments/${establishmentId}/assets`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function createAcademicYear(
  establishmentId: string,
  input: {
    name: string;
    startsAt: string;
    endsAt: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  }
) {
  return request<AcademicYear>(`/establishments/${establishmentId}/academic-years`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function activateAcademicYear(establishmentId: string, academicYearId: string) {
  return request<AcademicYear>(
    `/establishments/${establishmentId}/academic-years/${academicYearId}/activate`,
    { method: "POST" }
  );
}

export function getDashboard(establishmentId: string) {
  return request<DashboardSummary>(`/establishments/${establishmentId}/dashboard`);
}

export function getLevels(establishmentId: string) {
  return request<Level[]>(`/establishments/${establishmentId}/levels`);
}

export function createLevel(
  establishmentId: string,
  input: {
    name: string;
    code?: string;
    orderIndex?: number;
  }
) {
  return request<Level>(`/establishments/${establishmentId}/levels`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function getSubjects(establishmentId: string) {
  return request<Subject[]>(`/establishments/${establishmentId}/subjects`);
}

export function createSubject(
  establishmentId: string,
  input: {
    name: string;
    code?: string;
    subjectGroup?: string;
  }
) {
  return request<Subject>(`/establishments/${establishmentId}/subjects`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function getClasses(establishmentId: string) {
  return request<SchoolClass[]>(`/establishments/${establishmentId}/classes`);
}

export function createClass(
  establishmentId: string,
  input: {
    academicYearId: string;
    levelId?: string;
    mainTeacherId?: string;
    name: string;
    code?: string;
    capacity?: number;
  }
) {
  return request<SchoolClass>(`/establishments/${establishmentId}/classes`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function assignSubjectToClass(
  establishmentId: string,
  classId: string,
  input: {
    subjectId: string;
    teacherId?: string;
    coefficient?: number;
  }
) {
  return request(`/establishments/${establishmentId}/classes/${classId}/subjects`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function assignMainTeacher(
  establishmentId: string,
  classId: string,
  input: {
    teacherId?: string;
  }
) {
  return request<SchoolClass>(`/establishments/${establishmentId}/classes/${classId}/main-teacher`, {
    method: "PATCH",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function getTeachers(establishmentId: string) {
  return request<Teacher[]>(`/establishments/${establishmentId}/teachers`);
}

export function createTeacher(
  establishmentId: string,
  input: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    employmentType?: string;
    status?: string;
    hourlyRate?: number;
  }
) {
  return request<Teacher>(`/establishments/${establishmentId}/teachers`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function updateTeacher(
  establishmentId: string,
  teacherId: string,
  input: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    employmentType: string;
    status: string;
    hourlyRate: number;
  }>
) {
  return request<Teacher>(`/establishments/${establishmentId}/teachers/${teacherId}`, {
    method: "PATCH",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function getStudents(establishmentId: string, search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return request<Student[]>(`/establishments/${establishmentId}/students${query}`);
}

type StudentInput = {
  firstName: string;
  lastName: string;
  gender?: "FEMALE" | "MALE";
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  classId?: string;
  enrollmentType?: "NEW" | "REENROLLMENT" | "TRANSFER";
  guardians?: Array<{
    firstName: string;
    lastName: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: string;
    profession?: string;
    isPrimary?: boolean;
  }>;
};

export function createStudent(
  establishmentId: string,
  input: StudentInput
) {
  return request<Student>(`/establishments/${establishmentId}/students`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function updateStudent(
  establishmentId: string,
  studentId: string,
  input: Partial<StudentInput> & { status?: Student["status"] }
) {
  return request<Student>(`/establishments/${establishmentId}/students/${studentId}`, {
    method: "PATCH",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function getStudentDossier(establishmentId: string, studentId: string) {
  return request<StudentDossier>(
    `/establishments/${establishmentId}/students/${studentId}/dossier`
  );
}

export function getStudentDossierByMatricule(establishmentId: string, matricule: string) {
  return request<StudentDossier>(
    `/establishments/${establishmentId}/students/dossier?matricule=${encodeURIComponent(matricule)}`
  );
}

export function getStudentDocuments(establishmentId: string, studentId: string) {
  return request<StudentDocument[]>(
    `/establishments/${establishmentId}/students/${studentId}/documents`
  );
}

export function studentDocumentFileUrl(
  establishmentId: string,
  studentId: string,
  documentId: string,
  download = false
) {
  const path = `/establishments/${encodeURIComponent(establishmentId)}/students/${encodeURIComponent(
    studentId
  )}/documents/${encodeURIComponent(documentId)}/file`;
  return apiPath(download ? `${path}?download=1` : path);
}

export function uploadStudentDocument(
  establishmentId: string,
  studentId: string,
  input: {
    documentType: string;
    label?: string;
    originalName: string;
    mimeType: string;
    base64Content: string;
  }
) {
  return request<StudentDocument>(
    `/establishments/${establishmentId}/students/${studentId}/documents`,
    {
      method: "POST",
      body: JSON.stringify(stripEmptyStrings(input))
    }
  );
}

export function deleteStudentDocument(
  establishmentId: string,
  studentId: string,
  documentId: string
) {
  return request<{ id: string; deleted: boolean }>(
    `/establishments/${establishmentId}/students/${studentId}/documents/${documentId}`,
    {
      method: "DELETE"
    }
  );
}

export function getPaymentsOverview(establishmentId: string, academicYearId?: string) {
  const query = academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : "";
  return request<PaymentsOverview>(`/establishments/${establishmentId}/payments/overview${query}`);
}

export function createFeeItem(
  establishmentId: string,
  input: {
    academicYearId: string;
    name: string;
    amount: number;
    dueDate?: string;
    levelId?: string;
    classId?: string;
    required?: boolean;
  }
) {
  return request<FeeItem>(`/establishments/${establishmentId}/payments/fee-items`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function updateFeeItem(
  establishmentId: string,
  feeItemId: string,
  input: Partial<{
    name: string;
    amount: number;
    dueDate: string;
    classId: string;
    required: boolean;
  }>
) {
  return request<FeeItem>(`/establishments/${establishmentId}/payments/fee-items/${feeItemId}`, {
    method: "PATCH",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function deleteFeeItem(establishmentId: string, feeItemId: string) {
  return request<{ id: string; deleted: boolean }>(
    `/establishments/${establishmentId}/payments/fee-items/${feeItemId}`,
    {
      method: "DELETE"
    }
  );
}

export function assignFeeItem(
  establishmentId: string,
  feeItemId: string,
  input: {
    target: "ALL_ACTIVE" | "CLASS" | "STUDENT";
    classId?: string;
    studentId?: string;
  }
) {
  return request<{ assigned: number; skipped: number }>(
    `/establishments/${establishmentId}/payments/fee-items/${feeItemId}/assign`,
    {
      method: "POST",
      body: JSON.stringify(stripEmptyStrings(input))
    }
  );
}

export function collectPayment(
  establishmentId: string,
  input: {
    studentId: string;
    academicYearId: string;
    amount: number;
    method: "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CHECK" | "OTHER";
    reference?: string;
    receivedBy?: string;
  }
) {
  return request<PaymentRecord>(`/establishments/${establishmentId}/payments/collect`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function getGradesOverview(
  establishmentId: string,
  input?: {
    academicYearId?: string;
    classId?: string;
    periodId?: string;
  }
) {
  const params = new URLSearchParams();
  if (input?.academicYearId) {
    params.set("academicYearId", input.academicYearId);
  }
  if (input?.classId) {
    params.set("classId", input.classId);
  }
  if (input?.periodId) {
    params.set("periodId", input.periodId);
  }
  const query = params.toString();
  return request<GradesOverview>(
    `/establishments/${establishmentId}/grades/overview${query ? `?${query}` : ""}`
  );
}

export function createGradePeriod(
  establishmentId: string,
  input: {
    academicYearId: string;
    name: string;
    type: string;
    startsAt?: string;
    endsAt?: string;
  }
) {
  return request<GradePeriod>(`/establishments/${establishmentId}/grades/periods`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function createAssessment(
  establishmentId: string,
  input: {
    periodId: string;
    classSubjectId: string;
    name: string;
    maxScore?: number;
    weight?: number;
  }
) {
  return request<GradeAssessment>(`/establishments/${establishmentId}/grades/assessments`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export function saveGrades(
  establishmentId: string,
  input: {
    assessmentId: string;
    enteredBy?: string;
    grades: Array<{
      studentId: string;
      score: number;
      comment?: string;
    }>;
  }
) {
  return request<GradeAssessment>(`/establishments/${establishmentId}/grades/entries`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export type ReportCardStudent = {
  student: {
    id: string;
    matricule: string;
    firstName: string;
    lastName: string;
    gender?: string | null;
    birthDate?: string | null;
  };
  subjectAverages: Array<{
    subjectName: string;
    subjectGroup?: string | null;
    coefficient: number;
    average: number | null;
    grades: Array<{
      assessmentName: string;
      score: number;
      maxScore: number;
      weight: number;
    }>;
  }>;
  generalAverage: number | null;
  rank: number | null;
};

export type ReportCardData = {
  establishment: Establishment | null;
  academicYear: AcademicYear | null;
  period: GradePeriod;
  schoolClass: {
    id: string;
    name: string;
    level?: { name: string } | null;
    mainTeacher?: { firstName: string; lastName: string } | null;
  };
  totalStudents: number;
  classAverage: number | null;
  bestAverage: number | null;
  worstAverage: number | null;
  students: ReportCardStudent[];
};

export function getReportCard(
  establishmentId: string,
  input: { periodId: string; classId: string }
) {
  const params = new URLSearchParams({ periodId: input.periodId, classId: input.classId });
  return request<ReportCardData>(
    `/establishments/${establishmentId}/grades/report-card?${params.toString()}`
  );
}

export type ImportErrorRecord = {
  id: string;
  rowNumber: number;
  field?: string | null;
  message: string;
  rawValue?: string | null;
};

export type ImportJobRecord = {
  id: string;
  establishmentId: string;
  type: string;
  fileName: string;
  status: "pending" | "running" | "success" | "failed" | "completed_with_errors";
  mapping: any;
  totalRows: number;
  validRows: number;
  errorRows: number;
  startedBy?: string | null;
  startedAt: string;
  completedAt?: string | null;
  errors?: ImportErrorRecord[];
};

export function getImportJobs(establishmentId: string) {
  return request<ImportJobRecord[]>(`/establishments/${establishmentId}/imports`);
}

export function startStudentImport(
  establishmentId: string,
  input: {
    type: string;
    mapping: Record<string, string>;
    rows: Array<Record<string, any>>;
    classId?: string;
    startedBy?: string;
  }
) {
  return request<ImportJobRecord>(`/establishments/${establishmentId}/imports/students`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
}

export type BackupJob = {
  id: string;
  establishmentId: string;
  type: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  localPath?: string | null;
  cloudPath?: string | null;
  sizeBytes?: number | null;
  checksum?: string | null;
  encrypted: boolean;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
};

export function getBackups(establishmentId: string) {
  return request<BackupJob[]>(`/establishments/${establishmentId}/backups`);
}

export function startBackup(establishmentId: string) {
  return request<BackupJob>(`/establishments/${establishmentId}/backups`, {
    method: "POST"
  });
}

export function backupDownloadUrl(establishmentId: string, backupId: string) {
  return `${API_URL}/establishments/${establishmentId}/backups/${backupId}/download`;
}

export function restoreBackup(establishmentId: string, backupId: string) {
  return request<{ success: boolean; restoredFrom: string }>(
    `/establishments/${establishmentId}/backups/${backupId}/restore`,
    { method: "POST" }
  );
}

export function deleteBackup(establishmentId: string, backupId: string) {
  return request<{ success: boolean }>(
    `/establishments/${establishmentId}/backups/${backupId}`,
    { method: "DELETE" }
  );
}

// ────────────────────────────────────────────────
// SUPER ADMIN — API Fonctions
// ────────────────────────────────────────────────

export type PlatformStats = {
  totalEstablishments: number;
  licenses: {
    trial: number;
    active: number;
    expired: number;
    suspended: number;
  };
  totalStudents: number;
  totalUsers: number;
  recentBackupsThisWeek: number;
};

export function getPlatformStats() {
  return request<PlatformStats>("/establishments/stats");
}

export function updateEstablishmentLicense(
  establishmentId: string,
  dto: {
    planCode?: string;
    status?: string;
    expiresAt?: string;
    maxStudents?: number;
    durationMonths?: number;
  }
) {
  return request<Establishment>(`/establishments/${establishmentId}/license`, {
    method: "PATCH",
    body: JSON.stringify(dto)
  });
}

export function toggleEstablishmentModule(
  establishmentId: string,
  moduleCode: string,
  enabled: boolean
) {
  return request<Establishment>(`/establishments/${establishmentId}/modules/${moduleCode}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled })
  });
}

export function updateEstablishmentStatus(
  establishmentId: string,
  status: string,
  reason?: string
) {
  return request(`/establishments/${establishmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason })
  });
}

// ────────────────────────────────────────────────
// AUDIT LOGS — API Fonctions
// ────────────────────────────────────────────────

export type AuditLog = {
  id: string;
  establishmentId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string } | null;
  establishment?: { id: string; name: string } | null;
};

export type PaginatedAuditLogs = {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
};

export type AuditLogStats = {
  total: number;
  last24h: number;
  last7d: number;
  byAction: Array<{ action: string; _count: { action: number } }>;
};

/** Super Admin — Tous les logs avec filtres optionnels */
export function getAllAuditLogs(params?: {
  establishmentId?: string;
  action?: string;
  entityType?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.establishmentId) qs.set("establishmentId", params.establishmentId);
  if (params?.action) qs.set("action", params.action);
  if (params?.entityType) qs.set("entityType", params.entityType);
  if (params?.userId) qs.set("userId", params.userId);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  return request<PaginatedAuditLogs>(`/audit-logs?${qs.toString()}`);
}

/** Admin local — Logs de son propre établissement */
export function getEstablishmentAuditLogs(
  establishmentId: string,
  page = 1,
  limit = 50
) {
  return request<PaginatedAuditLogs>(
    `/audit-logs/establishments/${establishmentId}?page=${page}&limit=${limit}`
  );
}

/** Statistiques des logs (globales ou par établissement) */
export function getAuditLogStats(establishmentId?: string) {
  const qs = establishmentId ? `?establishmentId=${establishmentId}` : "";
  return request<AuditLogStats>(`/audit-logs/stats${qs}`);
}
