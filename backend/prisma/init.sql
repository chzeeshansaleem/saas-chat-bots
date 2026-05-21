CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Run this after Prisma migrations in production for ANN search performance:
-- CREATE INDEX IF NOT EXISTS embeddings_vector_ivfflat_idx
-- ON embeddings USING ivfflat (vector vector_cosine_ops)
-- WITH (lists = 100);
