import { IsEnum, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { SchedulingType } from 'src/doctor/entities/doctor.entity';

export class SetSchedulingConfigDto {
  @IsEnum(SchedulingType)
  schedulingType: SchedulingType;

  @ValidateIf((o) => o.schedulingType === SchedulingType.STREAM)
  @IsInt()
  @Min(1)
  slotDuration?: number;

  @ValidateIf((o) => o.schedulingType === SchedulingType.STREAM)
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferTime?: number;

  @ValidateIf((o) => o.schedulingType === SchedulingType.WAVE)
  @IsInt()
  @Min(1)
  maxAppointments?: number;
}
