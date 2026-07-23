import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  specialization: string;

  @IsInt()
  @Min(0)
  experience: number;

  @IsString()
  qualification: string;

  @IsNumber()
  consultationFee: number;

  @IsOptional()
  @IsString()
  profileDetails?: string;
}
