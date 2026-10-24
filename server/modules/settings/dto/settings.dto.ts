import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SettingsDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsInt() @Min(0) @Max(1000000) interest_per_million!: number;
}
