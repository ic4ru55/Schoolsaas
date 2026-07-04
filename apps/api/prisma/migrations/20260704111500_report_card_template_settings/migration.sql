ALTER TABLE "Establishment"
ADD COLUMN "reportCardHeaderLeft" TEXT,
ADD COLUMN "reportCardHeaderCenter" TEXT,
ADD COLUMN "reportCardHeaderRight" TEXT,
ADD COLUMN "reportCardTitle" TEXT NOT NULL DEFAULT 'BULLETIN DE NOTES',
ADD COLUMN "reportCardSignerTitle" TEXT NOT NULL DEFAULT 'Le Chef d''Etablissement',
ADD COLUMN "reportCardSignerName" TEXT;
