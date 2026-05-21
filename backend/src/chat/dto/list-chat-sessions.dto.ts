import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListChatSessionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'ARCHIVED', 'DELETED', 'ALL'])
  status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED' | 'ALL';
}
