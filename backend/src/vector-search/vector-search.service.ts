import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SearchResult = {
  chunkId: string;
  documentId: string;
  content: string;
  title: string;
  uri: string;
  similarity: number;
};

@Injectable()
export class VectorSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, vector: number[], topK = 6): Promise<SearchResult[]> {
    const vectorLiteral = `[${vector.join(',')}]`;
    return this.prisma.$queryRawUnsafe<SearchResult[]>(
      `
      SELECT
        dc.id AS "chunkId",
        d.id AS "documentId",
        dc.content,
        d.title,
        d.uri,
        1 - (e.vector <=> $1::vector) AS similarity
      FROM embeddings e
      JOIN document_chunks dc ON dc.id = e.chunk_id
      JOIN documents d ON d.id = dc.document_id
      WHERE e.tenant_id = $2
      ORDER BY e.vector <=> $1::vector
      LIMIT $3
      `,
      vectorLiteral,
      tenantId,
      topK,
    );
  }
}
