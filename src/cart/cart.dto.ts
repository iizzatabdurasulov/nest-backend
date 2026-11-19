import { IsInt, Max, Min } from 'class-validator';

export class SetCartQuantityDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  quantity: number;
}
