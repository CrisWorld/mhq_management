import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ItemDto } from './item.dto.js';

class UpdatedItemDto extends ItemDto {
  @IsInt() @Min(0) @Max(100000000000) price!: number;
}
export class OrderUpdateDto {
  @IsInt() @Min(1) version!: number;
  @IsDateString({ strict: true }) ordered_on!: string;
  @IsBoolean() apply_interest!: boolean;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => UpdatedItemDto)
  items!: UpdatedItemDto[];
  @IsString() @MaxLength(2000) note!: string;
}
