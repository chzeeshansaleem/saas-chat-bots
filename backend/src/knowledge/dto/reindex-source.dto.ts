import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ReindexSourceDto {
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
