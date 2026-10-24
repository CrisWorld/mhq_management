import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class ItemDto {
  @IsUUID() product_id!: string;
  @IsInt() @Min(1) @Max(10000) quantity!: number;
}
