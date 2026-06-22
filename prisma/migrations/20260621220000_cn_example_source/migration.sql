-- Add source column to track example origin (excel_import vs admin/manual)
ALTER TABLE "CnExample" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'admin';
