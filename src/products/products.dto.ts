import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class ProductDto {
  @IsString()
  @MinLength(2)
  title: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsString()
  @Matches(/^\/uploads\/[0-9a-f-]+\.(jpg|png|webp)$/, {
    message: 'image must be a path returned by POST /products/upload',
  })
  image?: string | null;
}
