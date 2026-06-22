-- Drop unused component-familiarity table (no longer wired to practice/SRS)
DROP TABLE IF EXISTS "CnUserComponentProgress";

-- Drop legacy sentence tokenization column (fill_sentence uses targetWord offsets)
ALTER TABLE "CnExample" DROP COLUMN IF EXISTS "tokens";
