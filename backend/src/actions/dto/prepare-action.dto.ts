import { IsObject, IsString } from 'class-validator';

export class PrepareActionDto {
  @IsString()
  toolKey!: string;

  @IsObject()
  inputPayload!: Record<string, unknown>;
}
