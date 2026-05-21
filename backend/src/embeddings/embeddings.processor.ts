import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from '../queues/queue.constants';
import { EmbeddingsService } from './embeddings.service';

type EmbeddingJob = {
  chunkId: string;
  tenantId: string;
  content: string;
};

@Processor(QUEUES.embeddings, { concurrency: 1, lockDuration: 300_000 })
export class EmbeddingsProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingsProcessor.name);

  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<EmbeddingJob>) {
    this.logger.log(
      `Embedding job picked ${JSON.stringify({
        bullJobId: job.id,
        chunkId: job.data.chunkId,
        tenantId: job.data.tenantId,
        contentLength: job.data.content.length,
      })}`,
    );

    try {
      const vector = await this.embeddings.embed(job.data.content);
      const vectorLiteral = `[${vector.join(',')}]`;
      await this.prisma.$executeRawUnsafe(
        `
        INSERT INTO embeddings (id, chunk_id, tenant_id, model, vector, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())
        ON CONFLICT (chunk_id)
        DO UPDATE SET model = EXCLUDED.model, vector = EXCLUDED.vector
        `,
        job.data.chunkId,
        job.data.tenantId,
        this.embeddings.getModel(),
        vectorLiteral,
      );
      this.logger.log(
        `Embedding saved ${JSON.stringify({
          bullJobId: job.id,
          chunkId: job.data.chunkId,
          tenantId: job.data.tenantId,
          model: this.embeddings.getModel(),
          dimensions: vector.length,
        })}`,
      );
    } catch (error) {
      this.logger.error(
        `Embedding job failed ${JSON.stringify({
          bullJobId: job.id,
          chunkId: job.data.chunkId,
          tenantId: job.data.tenantId,
          message: error instanceof Error ? error.message : String(error),
        })}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
