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
  name: string;
  code?: string | null;
  capacity?: number | null;
  academicYear?: AcademicYear;
  level?: Level | null;
  classSubjects?: Array<{
    id: string;
    coefficient: string | number;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

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
    return message;
  }

  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
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

    throw new Error(apiErrorMessage(body, `API error ${response.status}`));
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
    coefficient?: number;
  }
) {
  return request(`/establishments/${establishmentId}/classes/${classId}/subjects`, {
    method: "POST",
    body: JSON.stringify(input)
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
