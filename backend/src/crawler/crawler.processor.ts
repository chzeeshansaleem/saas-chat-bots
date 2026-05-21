import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from '../queues/queue.constants';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { CrawlerService } from './crawler.service';

type CrawlJobData = {
  tenantId: string;
  sourceId: string;
  crawlJobId: string;
  rootUrl: string;
  depth: number;
  pageLimit: number;
};

@Processor(QUEUES.crawler, { concurrency: 1, lockDuration: 300_000 })
export class CrawlerProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlerProcessor.name);

  constructor(
    private readonly crawler: CrawlerService,
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {
    super();
  }

  async process(job: Job<CrawlJobData>) {
    const startedAt = Date.now();
    this.logger.log(
      `Crawler job picked by worker ${JSON.stringify({
        bullJobId: job.id,
        queue: QUEUES.crawler,
        name: job.name,
        attempt: job.attemptsMade + 1,
        tenantId: job.data.tenantId,
        sourceId: job.data.sourceId,
        crawlJobId: job.data.crawlJobId,
        rootUrl: job.data.rootUrl,
        depth: job.data.depth,
        pageLimit: job.data.pageLimit,
      })}`,
    );

    await this.prisma.crawlJob.update({ where: { id: job.data.crawlJobId }, data: { status: 'RUNNING' } });
    await this.prisma.knowledgeSource.update({ where: { id: job.data.sourceId }, data: { status: 'PROCESSING' } });
    this.logger.log(
      `Crawler status changed ${JSON.stringify({
        crawlJobId: job.data.crawlJobId,
        crawlJobStatus: 'RUNNING',
        sourceId: job.data.sourceId,
        sourceStatus: 'PROCESSING',
      })}`,
    );

    try {
      const result = await this.crawler.crawl(job.data.rootUrl, job.data.depth, job.data.pageLimit);
      this.logger.log(
        `Crawler finished page discovery ${JSON.stringify({
          crawlJobId: job.data.crawlJobId,
          pages: result.pages.length,
          failures: result.failures.length,
        })}`,
      );

      for (const failure of result.failures) {
        await this.prisma.crawlLog.create({
          data: {
            crawlJobId: job.data.crawlJobId,
            url: failure.url,
            statusCode: failure.statusCode,
            message: failure.message.slice(0, 5000),
          },
        });
        this.logger.warn(
          `Crawler page failed and was saved to crawl_logs ${JSON.stringify({
            crawlJobId: job.data.crawlJobId,
            url: failure.url,
            statusCode: failure.statusCode,
            message: failure.message.slice(0, 500),
          })}`,
        );
      }

      for (const page of result.pages) {
        if (!page.text) continue;
        const contentHash = createHash('sha256').update(page.text).digest('hex');
        const document = await this.prisma.document.upsert({
          where: { tenantId_contentHash: { tenantId: job.data.tenantId, contentHash } },
          update: { rawText: page.text, title: page.title, uri: page.url },
          create: {
            tenantId: job.data.tenantId,
            knowledgeSourceId: job.data.sourceId,
            title: page.title || page.url,
            uri: page.url,
            contentHash,
            rawText: page.text,
            metadata: { rootUrl: job.data.rootUrl, description: page.description },
          },
        });

        await this.prisma.crawlLog.create({
          data: { crawlJobId: job.data.crawlJobId, url: page.url, statusCode: 200, message: 'Indexed' },
        });
        this.logger.log(
          `Crawler page saved as document ${JSON.stringify({
            crawlJobId: job.data.crawlJobId,
            documentId: document.id,
            url: page.url,
            title: document.title,
            textLength: page.text.length,
            contentHash,
          })}`,
        );

        let chunkCount = 0;
        for (const [ordinal, content] of this.embeddings.chunk(page.text).entries()) {
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
          const vector = await this.embeddings.embed(content);
          await this.saveEmbedding(chunk.id, job.data.tenantId, vector);
          chunkCount += 1;
          this.logger.log(
            `Crawler chunk embedding saved ${JSON.stringify({
              crawlJobId: job.data.crawlJobId,
              documentId: document.id,
              chunkId: chunk.id,
              ordinal,
              dimensions: vector.length,
            })}`,
          );
        }
        this.logger.log(
          `Document chunking completed ${JSON.stringify({
            crawlJobId: job.data.crawlJobId,
            documentId: document.id,
            chunkCount,
          })}`,
        );
      }

      if (result.pages.length === 0) {
        throw new Error(result.failures[0]?.message || 'Crawler did not index any pages.');
      }

      await this.prisma.crawlJob.update({ where: { id: job.data.crawlJobId }, data: { status: 'COMPLETED' } });
      await this.prisma.knowledgeSource.update({ where: { id: job.data.sourceId }, data: { status: 'READY' } });
      this.logger.log(
        `Crawler job completed ${JSON.stringify({
          bullJobId: job.id,
          crawlJobId: job.data.crawlJobId,
          sourceId: job.data.sourceId,
          crawlJobStatus: 'COMPLETED',
          sourceStatus: 'READY',
          durationMs: Date.now() - startedAt,
        })}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.stack || error.message : String(error);
      await this.prisma.crawlLog.create({
        data: { crawlJobId: job.data.crawlJobId, url: job.data.rootUrl, message },
      });
      await this.prisma.crawlJob.update({ where: { id: job.data.crawlJobId }, data: { status: 'FAILED' } });
      await this.prisma.knowledgeSource.update({ where: { id: job.data.sourceId }, data: { status: 'FAILED' } });
      this.logger.error(
        `Crawler job failed ${JSON.stringify({
          bullJobId: job.id,
          crawlJobId: job.data.crawlJobId,
          sourceId: job.data.sourceId,
          crawlJobStatus: 'FAILED',
          sourceStatus: 'FAILED',
          durationMs: Date.now() - startedAt,
          message: message.slice(0, 1000),
        })}`,
      );
      throw error;
    }
  }

  private async saveEmbedding(chunkId: string, tenantId: string, vector: number[]) {
    const vectorLiteral = `[${vector.join(',')}]`;
    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO embeddings (id, chunk_id, tenant_id, model, vector, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())
      ON CONFLICT (chunk_id)
      DO UPDATE SET model = EXCLUDED.model, vector = EXCLUDED.vector
      `,
      chunkId,
      tenantId,
      this.embeddings.getModel(),
      vectorLiteral,
    );
  }
}
