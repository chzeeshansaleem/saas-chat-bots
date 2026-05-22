import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { IntegrationAuthType } from '@prisma/client';

export class CreateApiConnectorDto {
  @IsString()
  name!: string;

  @IsString()
  baseUrl!: string;

  @IsEnum(IntegrationAuthType)
  authType!: IntegrationAuthType;

  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}
