import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateWidgetSessionDto {
  @IsString()
  tenantId!: string;

  @IsString()
  botId!: string;

  @IsOptional()
  @IsObject()
  user?: {
    id?: string;
    email?: string;
    name?: string;
    signature?: string;
    jwt?: string;
  };
}
