import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { HttpMethod } from '@prisma/client';

export class CreateApiToolDto {
  @IsString()
  name!: string;

  @IsString()
  toolKey!: string;

  @IsEnum(HttpMethod)
  method!: HttpMethod;

  @IsString()
  path!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsObject()
  inputSchema?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  requestMapping?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  responseMapping?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  confirmationRequired?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];
}
