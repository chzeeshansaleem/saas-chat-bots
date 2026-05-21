import { IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CreateWebsiteSourceDto {
  @IsString()
  name!: string;

  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  depth = 2;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(250)
  pageLimit = 2;
}
