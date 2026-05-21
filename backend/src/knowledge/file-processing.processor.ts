import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from '../queues/queue.constants';
import { EmbeddingsService } from '../embeddings/embeddings.service';

type FileJob = {
  tenantId: string;
  sourceId: string;
  filePath: string;
  filename: string;
};

@Processor(QUEUES.fileProcessing, { concurrency: 2 })
export class FileProcessingProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
    @InjectQueue(QUEUES.embeddings) private readonly embeddingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<FileJob>) {
    await this.prisma.knowledgeSource.update({ where: { id: job.data.sourceId }, data: { status: 'PROCESSING' } });
    const text = await this.extractText(job.data.filePath, job.data.filename);
    const contentHash = createHash('sha256').update(text).digest('hex');

    const document = await this.prisma.document.upsert({
      where: { tenantId_contentHash: { tenantId: job.data.tenantId, contentHash } },
      update: { rawText: text },
      create: {
        tenantId: job.data.tenantId,
        knowledgeSourceId: job.data.sourceId,
        title: job.data.filename,
        uri: job.data.filePath,
        contentHash,
        rawText: text,
      },
    });

    const chunks = this.embeddings.chunk(text);
    for (const [ordinal, content] of chunks.entries()) {
      const chunk = await this.prisma.documentChunk.upsert({
        where: { documentId_ordinal: { documentId: document.id, ordinal } },
        update: { content, tokenCount: Math.ceil(content.length / 4) },
        create: {
          tenantId: job.data.tenantId,
          documentId: document.id,
          ordinal,
          content,
          tokenCount: Math.ceil(content.length / 4),
        },
      });
      await this.embeddingQueue.add('embed-chunk', { chunkId: chunk.id, tenantId: job.data.tenantId, content });
    }
    await this.prisma.knowledgeSource.update({ where: { id: job.data.sourceId }, data: { status: 'READY' } });
  }

  private async extractText(filePath: string, filename: string) {
    const buffer = await readFile(filePath);
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return (await pdf(buffer)).text;
    if (lower.endsWith('.docx')) return (await mammoth.extractRawText({ buffer })).value;
    return buffer.toString('utf8');
  }
}
