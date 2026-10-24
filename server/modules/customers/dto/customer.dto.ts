import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class CustomerDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsString() @MaxLength(25) phone!: string;
  @IsString() @MaxLength(500) address!: string;
  @IsBoolean() apply_interest!: boolean;
}
