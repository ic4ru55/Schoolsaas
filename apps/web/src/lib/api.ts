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
  academicYears?: AcademicYear[];
  modules?: Array<{ moduleCode: string; enabled: boolean }>;
  licenses?: Array<{ planCode: string; status: string }>;
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
  const response = await fetch(apiPath(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
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

export function createStudent(
  establishmentId: string,
  input: {
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
  }
) {
  return request<Student>(`/establishments/${establishmentId}/students`, {
    method: "POST",
    body: JSON.stringify(stripEmptyStrings(input))
  });
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
