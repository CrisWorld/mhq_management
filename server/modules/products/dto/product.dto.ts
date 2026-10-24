import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ProductDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsInt() @Min(0) @Max(100000000000) price!: number;
}
