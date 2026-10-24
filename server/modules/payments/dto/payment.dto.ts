import { IsDateString, IsInt, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class PaymentDto {
  @IsUUID() id!: string;
  @IsInt() @Min(1) @Max(1000000000000) amount!: number;
  @IsDateString({ strict: true }) paid_on!: string;
  @IsString() @MaxLength(1000) note!: string;
}
