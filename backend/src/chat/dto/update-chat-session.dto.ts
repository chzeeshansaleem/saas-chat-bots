import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateChatSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}
