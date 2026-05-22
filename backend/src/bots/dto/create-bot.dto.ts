import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { WidgetPosition } from '@prisma/client';

export class CreateBotDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  themeColor?: string;

  @IsOptional()
  @IsEnum(WidgetPosition)
  position?: WidgetPosition;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2147483647)
  zIndex?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedQuestions?: string[];

  @IsOptional()
  @IsBoolean()
  allowAnonymous?: boolean;

  @IsOptional()
  @IsBoolean()
  requireSignedIdentity?: boolean;

  @IsOptional()
  @IsString()
  identitySecret?: string;
}
