ALTER TABLE "Establishment"
ADD COLUMN "studentMatriculePrefix" TEXT NOT NULL DEFAULT 'SB',
ADD COLUMN "studentMatriculeFormat" TEXT NOT NULL DEFAULT '{PREFIX}-{YEAR}-{SEQ}',
ADD COLUMN "studentMatriculeNextNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "studentMatriculePadding" INTEGER NOT NULL DEFAULT 4;
