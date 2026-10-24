import { IsString, Matches } from 'class-validator';
export class StatementDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;
}
