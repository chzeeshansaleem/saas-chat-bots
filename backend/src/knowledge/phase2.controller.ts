import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateWebsiteSourceDto } from './dto/create-website-source.dto';
import { ReindexSourceDto } from './dto/reindex-source.dto';
import { UpdateKnowledgeSourceDto } from './dto/update-knowledge-source.dto';
import { KnowledgeService } from './knowledge.service';

const pdfUploadInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync('./uploads', { recursive: true });
      cb(null, './uploads');
    },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`),
  }),
  fileFilter: (_req, file, cb) => cb(null, extname(file.originalname).toLowerCase() === '.pdf' && file.mimetype === 'application/pdf'),
  limits: { fileSize: 20 * 1024 * 1024 },
});

@ApiBearerAuth()
@ApiTags('knowledge-sources')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('knowledge-sources')
export class KnowledgeSourcesPhase2Controller {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Roles('ADMIN')
  @Post('website')
  addWebsite(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateWebsiteSourceDto) {
    return this.knowledge.addWebsite(user.tenantId!, dto);
  }

  @Roles('ADMIN')
  @ApiConsumes('multipart/form-data')
  @Post('pdf')
  @UseInterceptors(pdfUploadInterceptor)
  uploadPdf(@CurrentUserDecorator() user: CurrentUser, @UploadedFile() file: Express.Multer.File) {
    return this.knowledge.addFile(user.tenantId!, file);
  }

  @Get()
  list(@CurrentUserDecorator() user: CurrentUser) {
    return this.knowledge.listSources(user.tenantId!);
  }

  @Get(':id')
  get(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.getSource(user.tenantId!, id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: UpdateKnowledgeSourceDto) {
    return this.knowledge.updateSource(user.tenantId!, id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  delete(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.deleteSource(user.tenantId!, id);
  }

  @Roles('ADMIN')
  @Post(':id/resync')
  resync(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: ReindexSourceDto) {
    return this.knowledge.reindexSource(user.tenantId!, id, dto);
  }
}

@ApiBearerAuth()
@ApiTags('crawler')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('crawler')
export class CrawlerPhase2Controller {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Roles('ADMIN')
  @Post('start')
  start(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateWebsiteSourceDto) {
    return this.knowledge.addWebsite(user.tenantId!, dto);
  }

  @Get('jobs')
  jobs(@CurrentUserDecorator() user: CurrentUser, @Query('sourceId') sourceId?: string) {
    return this.knowledge.listCrawlJobs(user.tenantId!, sourceId);
  }

  @Get('jobs/:id')
  job(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.getCrawlJob(user.tenantId!, id);
  }

  @Get('jobs/:id/logs')
  logs(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.getCrawlLogs(user.tenantId!, id);
  }
}

@ApiBearerAuth()
@ApiTags('documents')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('documents')
export class DocumentsPhase2Controller {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  list(@CurrentUserDecorator() user: CurrentUser, @Query('sourceId') sourceId?: string) {
    return this.knowledge.listDocuments(user.tenantId!, sourceId);
  }

  @Get(':id')
  get(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.getDocument(user.tenantId!, id);
  }

  @Roles('ADMIN')
  @Delete(':id')
  delete(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.deleteDocument(user.tenantId!, id);
  }
}

@ApiBearerAuth()
@ApiTags('pdf')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('pdf')
export class PdfPhase2Controller {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Roles('ADMIN')
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(pdfUploadInterceptor)
  upload(@CurrentUserDecorator() user: CurrentUser, @UploadedFile() file: Express.Multer.File) {
    return this.knowledge.addFile(user.tenantId!, file);
  }

  @Get(':id/status')
  status(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.knowledge.getSource(user.tenantId!, id);
  }
}

@ApiBearerAuth()
@ApiTags('embeddings')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('embeddings')
export class EmbeddingsPhase2Controller {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Roles('ADMIN')
  @Post('rebuild/:sourceId')
  rebuild(@CurrentUserDecorator() user: CurrentUser, @Param('sourceId') sourceId: string) {
    return this.knowledge.rebuildEmbeddingsForSource(user.tenantId!, sourceId);
  }
}
