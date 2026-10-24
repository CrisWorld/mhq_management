import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemDto } from './item.dto.js';

export class OrderDto {
  @IsUUID() id!: string;
  @IsUUID() customer_id!: string;
  @IsDateString({ strict: true }) ordered_on!: string;
  @IsBoolean() apply_interest!: boolean;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items!: ItemDto[];
  @IsInt() @Min(0) @Max(1000000000000) down_payment!: number;
  @IsString() @MaxLength(2000) note!: string;
}
