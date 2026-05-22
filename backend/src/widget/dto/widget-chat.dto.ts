import { IsOptional, IsString } from 'class-validator';

export class WidgetChatDto {
  @IsString()
  sessionToken!: string;

  @IsOptional()
  @IsString()
  chatSessionId?: string;

  @IsString()
  message!: string;
}
