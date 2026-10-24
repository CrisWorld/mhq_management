import { IsDateString, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class PaymentUpdateDto {
  @IsInt() @Min(1) version!: number;
  @IsInt() @Min(1) @Max(1000000000000) amount!: number;
  @IsDateString({ strict: true }) paid_on!: string;
  @IsString() @MaxLength(1000) note!: string;
}
