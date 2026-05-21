import { IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateKnowledgeSourceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
