CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "label" TEXT,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentDocument_establishmentId_studentId_idx" ON "StudentDocument"("establishmentId", "studentId");
CREATE INDEX "StudentDocument_establishmentId_documentType_idx" ON "StudentDocument"("establishmentId", "documentType");

ALTER TABLE "StudentDocument"
ADD CONSTRAINT "StudentDocument_establishmentId_fkey"
FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentDocument"
ADD CONSTRAINT "StudentDocument_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
