import { IsEnum,IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Gender } from '../entities/patient.entity';

export class CreatePatientDto {
  @IsInt()
  @Min(0)
  age: number;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;
}
