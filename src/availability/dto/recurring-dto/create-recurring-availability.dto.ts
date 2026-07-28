import { IsEnum, IsString, Matches } from 'class-validator';
import { DayOfWeek } from 'src/availability/entities/recurring-availability.entity';


export class CreateRecurringAvailabilityDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM 24-hour format',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM 24-hour format',
  })
  endTime: string;
}
