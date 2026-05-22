import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomApiConnectorDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
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
