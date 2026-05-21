import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  rawText?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
