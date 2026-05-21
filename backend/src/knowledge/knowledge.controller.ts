import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserDecorator, CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateWebsiteSourceDto } from './dto/create-website-source.dto';
import { ReindexSourceDto } from './dto/reindex-source.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UpdateKnowledgeSourceDto } from './dto/update-knowledge-source.dto';
import { KnowledgeService } from './knowledge.service';

@ApiBearerAuth()
@ApiTags('knowledge')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get('sources')
  sources(@CurrentUserDecorator() user: CurrentUser) {
    return this.knowledge.listSources(user.tenantId!);
  }

  @Get('sources/:id')
  source(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.getSource(user.tenantId!, id);
  }

  @Post('website')
  addWebsite(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateWebsiteSourceDto) {
    return this.knowledge.addWebsite(user.tenantId!, dto);
  }

  @Patch('sources/:id')
  updateSource(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeSourceDto,
  ) {
    return this.knowledge.updateSource(user.tenantId!, id, dto);
  }

  @Delete('sources/:id')
  deleteSource(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.deleteSource(user.tenantId!, id);
  }

  @Post('sources/:id/reindex')
  reindexSource(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: ReindexSourceDto,
  ) {
    return this.knowledge.reindexSource(user.tenantId!, id, dto);
  }

  @ApiConsumes('multipart/form-data')
  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync('./uploads', { recursive: true });
          cb(null, './uploads');
        },
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`),
      }),
      fileFilter: (_req, file, cb) => cb(null, ['.pdf', '.docx', '.txt'].includes(extname(file.originalname).toLowerCase())),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  upload(@CurrentUserDecorator() user: CurrentUser, @UploadedFile() file: Express.Multer.File) {
    return this.knowledge.addFile(user.tenantId!, file);
  }

  @Get('documents')
  documents(@CurrentUserDecorator() user: CurrentUser, @Query('sourceId') sourceId?: string) {
    return this.knowledge.listDocuments(user.tenantId!, sourceId);
  }

  @Get('documents/:id')
  document(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.getDocument(user.tenantId!, id);
  }

  @Patch('documents/:id')
  updateDocument(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.knowledge.updateDocument(user.tenantId!, id, dto);
  }

  @Delete('documents/:id')
  deleteDocument(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.deleteDocument(user.tenantId!, id);
  }

  @Get('crawl-jobs')
  crawlJobs(@CurrentUserDecorator() user: CurrentUser, @Query('sourceId') sourceId?: string) {
    return this.knowledge.listCrawlJobs(user.tenantId!, sourceId);
  }

  @Get('crawl-jobs/:id/logs')
  crawlLogs(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.getCrawlLogs(user.tenantId!, id);
  }

  @Patch('crawl-jobs/:id/cancel')
  cancelCrawlJob(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.cancelCrawlJob(user.tenantId!, id);
  }
}
