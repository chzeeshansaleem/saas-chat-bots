import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomApiEndpointDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsIn(['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])
  method!: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

  @IsString()
  path!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsObject()
  inputSchema?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  responseMapping?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  confirmationRequired?: boolean;
}
