import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from '../queues/queue.constants';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { CreateWebsiteSourceDto } from './dto/create-website-source.dto';
import { ReindexSourceDto } from './dto/reindex-source.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UpdateKnowledgeSourceDto } from './dto/update-knowledge-source.dto';
import { KnowledgeRepository } from './knowledge.repository';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly websitePageLimit = 2;

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: KnowledgeRepository,
    private readonly embeddings: EmbeddingsService,
    @InjectQueue(QUEUES.crawler) private readonly crawlerQueue: Queue,
    @InjectQueue(QUEUES.fileProcessing) private readonly fileQueue: Queue,
    @InjectQueue(QUEUES.embeddings) private readonly embeddingQueue: Queue,
  ) {}

  listSources(tenantId: string) {
    return this.repo.listSources(tenantId);
  }

  async getSource(tenantId: string, sourceId: string) {
    const source = await this.prisma.knowledgeSource.findFirst({
      where: { id: sourceId, tenantId },
      include: {
        documents: { select: { id: true, title: true, uri: true, createdAt: true } },
        crawlJobs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!source) throw new NotFoundException('Knowledge source not found.');
    return source;
  }

  async updateSource(tenantId: string, sourceId: string, dto: UpdateKnowledgeSourceDto) {
    const source = await this.getSource(tenantId, sourceId);
    if (dto.url && source.type !== 'WEBSITE') {
      throw new BadRequestException('Only website sources can have a URL.');
    }
    return this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        name: dto.name,
        url: dto.url,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        status: dto.url && dto.url !== source.url ? 'PENDING' : undefined,
      },
    });
  }

  async deleteSource(tenantId: string, sourceId: string) {
    await this.getSource(tenantId, sourceId);
    await this.prisma.knowledgeSource.delete({ where: { id: sourceId } });
    return { deleted: true };
  }

  async addWebsite(tenantId: string, dto: CreateWebsiteSourceDto) {
    const depth = dto.depth ?? 2;
    const pageLimit = this.normalizeWebsitePageLimit(dto.pageLimit);

    this.logger.log(
      `Website source create requested ${JSON.stringify({
        tenantId,
        url: dto.url,
        depth,
        pageLimit,
      })}`,
    );

    const source = await this.prisma.knowledgeSource.create({
      data: {
        tenantId,
        type: 'WEBSITE',
        name: dto.name,
        url: dto.url,
        status: 'PENDING',
        crawlJobs: {
          create: {
            tenantId,
            rootUrl: dto.url,
            depth,
            pageLimit,
          },
        },
      },
      include: { crawlJobs: true },
    });

    this.logger.log(
      `Website source saved with PENDING crawl job ${JSON.stringify({
        tenantId,
        sourceId: source.id,
        crawlJobId: source.crawlJobs[0].id,
        status: source.status,
      })}`,
    );

    const queueJob = await this.crawlerQueue.add('crawl-website', {
      tenantId,
      sourceId: source.id,
      crawlJobId: source.crawlJobs[0].id,
      rootUrl: dto.url,
      depth,
      pageLimit,
    });

    this.logger.log(
      `Crawler BullMQ job queued ${JSON.stringify({
        bullJobId: queueJob.id,
        queue: QUEUES.crawler,
        name: queueJob.name,
        tenantId,
        sourceId: source.id,
        crawlJobId: source.crawlJobs[0].id,
      })}`,
    );
    return source;
  }

  async addFile(tenantId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('A PDF, DOCX, or TXT file is required.');
    const extension = file.originalname.split('.').pop()?.toUpperCase();
    const type = extension === 'PDF' || extension === 'DOCX' || extension === 'TXT' ? extension : 'TXT';
    const source = await this.prisma.knowledgeSource.create({
      data: {
        tenantId,
        type,
        name: file.originalname,
        filePath: file.path,
        status: 'PENDING',
        metadata: { size: file.size, mimetype: file.mimetype },
      },
    });
    await this.fileQueue.add('process-file', { tenantId, sourceId: source.id, filePath: file.path, filename: file.originalname });
    return source;
  }

  async reindexSource(tenantId: string, sourceId: string, dto: ReindexSourceDto) {
    const source = await this.getSource(tenantId, sourceId);
    const depth = dto.depth ?? 2;
    const pageLimit = this.normalizeWebsitePageLimit(dto.pageLimit);

    this.logger.log(
      `Reindex requested ${JSON.stringify({
        tenantId,
        sourceId,
        sourceType: source.type,
        currentStatus: source.status,
        url: source.url,
        depth,
        pageLimit,
      })}`,
    );

    await this.prisma.knowledgeSource.update({ where: { id: sourceId }, data: { status: 'PENDING' } });
    this.logger.log(`Knowledge source status changed to PENDING ${JSON.stringify({ tenantId, sourceId })}`);

    if (source.type === 'WEBSITE') {
      if (!source.url) throw new BadRequestException('Website source does not have a URL.');
      const deleted = await this.prisma.document.deleteMany({ where: { tenantId, knowledgeSourceId: sourceId } });
      this.logger.log(
        `Old source documents deleted before reindex ${JSON.stringify({
          tenantId,
          sourceId,
          deletedDocuments: deleted.count,
        })}`,
      );

      const crawlJob = await this.prisma.crawlJob.create({
        data: {
          tenantId,
          knowledgeSourceId: sourceId,
          rootUrl: source.url,
          depth,
          pageLimit,
        },
      });

      this.logger.log(
        `Crawl job row created as QUEUED ${JSON.stringify({
          tenantId,
          sourceId,
          crawlJobId: crawlJob.id,
          rootUrl: source.url,
          depth,
          pageLimit,
        })}`,
      );

      const queueJob = await this.crawlerQueue.add('crawl-website', {
        tenantId,
        sourceId,
        crawlJobId: crawlJob.id,
        rootUrl: source.url,
        depth,
        pageLimit,
      });

      this.logger.log(
        `Reindex BullMQ job queued ${JSON.stringify({
          bullJobId: queueJob.id,
          queue: QUEUES.crawler,
          name: queueJob.name,
          tenantId,
          sourceId,
          crawlJobId: crawlJob.id,
        })}`,
      );
      return crawlJob;
    }

    if (!source.filePath) throw new BadRequestException('File source does not have a stored file path.');
    const queueJob = await this.fileQueue.add('process-file', {
      tenantId,
      sourceId,
      filePath: source.filePath,
      filename: source.name,
    });
    this.logger.log(
      `File reindex BullMQ job queued ${JSON.stringify({
        bullJobId: queueJob.id,
        queue: QUEUES.fileProcessing,
        name: queueJob.name,
        tenantId,
        sourceId,
      })}`,
    );
    return { queued: true };
  }

  listDocuments(tenantId: string, sourceId?: string) {
    return this.prisma.document.findMany({
      where: { tenantId, knowledgeSourceId: sourceId },
      orderBy: { createdAt: 'desc' },
      include: {
        knowledgeSource: { select: { id: true, name: true, type: true, status: true } },
        _count: { select: { chunks: true } },
      },
    });
  }

  async getDocument(tenantId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      include: {
        knowledgeSource: { select: { id: true, name: true, type: true, status: true } },
        chunks: { orderBy: { ordinal: 'asc' }, take: 20 },
      },
    });
    if (!document) throw new NotFoundException('Document not found.');
    return document;
  }

  async updateDocument(tenantId: string, documentId: string, dto: UpdateDocumentDto) {
    const document = await this.getDocument(tenantId, documentId);
    const rawTextChanged = typeof dto.rawText === 'string' && dto.rawText !== document.rawText;
    const contentHash = rawTextChanged ? createHash('sha256').update(dto.rawText!).digest('hex') : undefined;

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        title: dto.title,
        rawText: dto.rawText,
        contentHash,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    if (rawTextChanged) {
      await this.replaceDocumentChunks(tenantId, documentId, dto.rawText!);
      await this.prisma.knowledgeSource.update({
        where: { id: document.knowledgeSourceId },
        data: { status: 'READY' },
      });
    }

    return updated;
  }

  async deleteDocument(tenantId: string, documentId: string) {
    await this.getDocument(tenantId, documentId);
    await this.prisma.document.delete({ where: { id: documentId } });
    return { deleted: true };
  }

  listCrawlJobs(tenantId: string, sourceId?: string) {
    return this.prisma.crawlJob.findMany({
      where: { tenantId, knowledgeSourceId: sourceId },
      orderBy: { createdAt: 'desc' },
      include: { knowledgeSource: { select: { id: true, name: true, url: true } } },
    });
  }

  async getCrawlJob(tenantId: string, crawlJobId: string) {
    const job = await this.prisma.crawlJob.findFirst({
      where: { id: crawlJobId, tenantId },
      include: {
        knowledgeSource: { select: { id: true, name: true, url: true, type: true, status: true } },
        logs: { orderBy: { crawledAt: 'desc' }, take: 25 },
      },
    });
    if (!job) throw new NotFoundException('Crawl job not found.');
    return job;
  }

  async getCrawlLogs(tenantId: string, crawlJobId: string) {
    const job = await this.prisma.crawlJob.findFirst({ where: { id: crawlJobId, tenantId } });
    if (!job) throw new NotFoundException('Crawl job not found.');
    return this.prisma.crawlLog.findMany({
      where: { crawlJobId },
      orderBy: { crawledAt: 'desc' },
    });
  }

  async cancelCrawlJob(tenantId: string, crawlJobId: string) {
    const job = await this.prisma.crawlJob.findFirst({ where: { id: crawlJobId, tenantId } });
    if (!job) throw new NotFoundException('Crawl job not found.');
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      throw new BadRequestException('Only queued or running crawl jobs can be cancelled.');
    }
    return this.prisma.crawlJob.update({ where: { id: crawlJobId }, data: { status: 'CANCELLED' } });
  }

  async rebuildEmbeddingsForSource(tenantId: string, sourceId: string) {
    await this.getSource(tenantId, sourceId);
    await this.prisma.$executeRawUnsafe(
      `
      DELETE FROM embeddings e
      USING document_chunks dc, documents d
      WHERE e.chunk_id = dc.id
        AND dc.document_id = d.id
        AND d.tenant_id = $1
        AND d.knowledge_source_id = $2
      `,
      tenantId,
      sourceId,
    );

    const chunks = await this.prisma.documentChunk.findMany({
      where: { tenantId, document: { knowledgeSourceId: sourceId } },
      select: { id: true, content: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const chunk of chunks) {
      await this.embeddingQueue.add('embed-chunk', { chunkId: chunk.id, tenantId, content: chunk.content });
    }

    return { queued: chunks.length };
  }

  private async replaceDocumentChunks(tenantId: string, documentId: string, text: string) {
    await this.prisma.documentChunk.deleteMany({ where: { documentId, tenantId } });
    for (const [ordinal, content] of this.embeddings.chunk(text).entries()) {
      const chunk = await this.prisma.documentChunk.create({
        data: {
          tenantId,
          documentId,
          ordinal,
          content,
          tokenCount: Math.ceil(content.length / 4),
        },
      });
      await this.embeddingQueue.add('embed-chunk', { chunkId: chunk.id, tenantId, content });
    }
  }

  private normalizeWebsitePageLimit(pageLimit?: number) {
    return Math.min(Math.max(pageLimit ?? this.websitePageLimit, 1), this.websitePageLimit);
  }
}
