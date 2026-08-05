import { DayOfWeek } from '../entities/recurring-availability.entity';

// The function .getDay() returns an index for each week
export function getDayOfWeek(dateStr: string): DayOfWeek {
  const dayIndex = new Date(dateStr).getDay();
  const days = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];
  return days[dayIndex];
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// This function checks the two different time slots if they are overlapping
export function isOverlapping(
  existingStart: string,
  existingEnd: string,
  newStart: string,
  newEnd: string,
): boolean {
  return (
    toMinutes(newStart) < toMinutes(existingEnd) &&
    toMinutes(newEnd) > toMinutes(existingStart)
  );
}

// This function checks the existing ranges from the saved slots with newly created slots for overlapping
export function hasOverlap(
  newStart: string,
  newEnd: string,
  existingRanges: { startTime: string; endTime: string }[],
): boolean {
  for (const range of existingRanges) {
    if (isOverlapping(range.startTime, range.endTime, newStart, newEnd)) {
      return true;
    }
  }
  return false;
}

// Validates if start and end time is legal argument
export function isValidRange(startTime: string, endTime: string): boolean {
  return toMinutes(startTime) < toMinutes(endTime);
}

// Converts the 'HH:MM:SS' -> 'HH:MM'
export function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

// To check the 30 min cutoff rule
export function isWithinCutoff(date: string, startTime: string, cutoffMinutes = 30): boolean {
  const appointmentTime = new Date(`${date}T${startTime}:00`).getTime();
  const cutoffTime = appointmentTime - cutoffMinutes * 60 * 1000;
  return Date.now() >= cutoffTime;
}

// Increase the day by one if current days slot are fully booked
export function addOneDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0]; // back to 'YYYY-MM-DD'
}
