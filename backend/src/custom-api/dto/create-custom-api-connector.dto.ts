import { IsIn, IsObject, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateCustomApiConnectorDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsUrl({ require_protocol: true })
  baseUrl!: string;

  @IsIn(['NONE', 'API_KEY', 'BEARER_TOKEN', 'BASIC'])
  authType!: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC';

  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  headers?: Record<string, unknown>;
}
