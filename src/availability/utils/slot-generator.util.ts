import { BadRequestException } from '@nestjs/common';
import { toMinutes } from './time.util';

// Conversion of Minutes to Time 
// e.g. 600 ---> 10:00

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function generateStreamSlot(
  startTime: string,
  endTime: string,
  slotDuration: number,
  bufferTime: number = 0,
): { startTime: string; endTime: string }[] {
  if (slotDuration <= 0) throw new BadRequestException('Invalid slot duration');
  if (bufferTime < 0) throw new BadRequestException('Invalid buffer time');

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const step = slotDuration + bufferTime;

  const slots : { startTime: string; endTime: string }[] = [];
 
  let cursor = start;

  while (cursor + slotDuration <= end) {
    slots.push({startTime:minutesToTime(cursor), endTime:minutesToTime(cursor + slotDuration)})
    cursor+=step
  }
  
  return slots
}
