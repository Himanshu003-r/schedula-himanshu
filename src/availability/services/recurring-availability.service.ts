import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RecurringAvailability } from '../entities/recurring-availability.entity';
import { Not, Repository } from 'typeorm';
import { CreateRecurringAvailabilityDto } from '../dto/recurring-dto/create-recurring-availability.dto';
import { getDayOfWeek, hasOverlap, isValidRange } from '../utils/time.util';
import { Doctor, SchedulingType } from 'src/doctor/entities/doctor.entity';
import { UpdateRecurringAvailabilityDto } from '../dto/recurring-dto/update-recurring-availability.dto';
import { CustomAvailabilityService } from './custom-availability.service';
import { generateStreamSlot } from '../utils/slot-generator.util';

@Injectable()
export class RecurringAvailabilityService {
  constructor(
    @InjectRepository(RecurringAvailability)
    private readonly recurringRepo: Repository<RecurringAvailability>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    private readonly customAvailabilityService: CustomAvailabilityService,
  ) {}

  async createRecurring(userId: string, dto: CreateRecurringAvailabilityDto) {
  const doctorId = await this.resolveDoctorId(userId);

  const { dayOfWeek, startTime, endTime } = dto;

  if (!isValidRange(startTime, endTime)) {
    throw new BadRequestException('Start Time should not be greater then End Time');
  }

  const existingSlots = await this.recurringRepo.find({
    where: { doctor: { id: doctorId }, dayOfWeek },
  });

  if (hasOverlap(startTime, endTime, existingSlots)) {
    throw new ConflictException('This slot overlaps with an existing availability');
  }

  const slot = this.recurringRepo.create({
    dayOfWeek,
    startTime,
    endTime,
    doctor: { id: doctorId } as Doctor,
  });

  await this.recurringRepo.save(slot);
  return { data: slot };
}

  async findAllRecurring(userId: string) {
      const doctorId = await this.resolveDoctorId(userId);

    const recurring = await this.recurringRepo.find({
      where: { doctor: { id: doctorId } },
    });

    return { data: recurring };
  }

  async updateRecurring(
    doctorId: string,
    id: string,
    dto: UpdateRecurringAvailabilityDto,
  ) {
    const slot = await this.recurringRepo.findOne({
      where: { id },
      relations: { doctor: true },
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    if (slot.doctor.id !== doctorId) {
      throw new NotFoundException('Slot does not exist');
    }

    const updatedSlot = this.recurringRepo.merge(slot, dto);

    if (!isValidRange(updatedSlot.startTime, updatedSlot.endTime)) {
      throw new BadRequestException(
        'Start Time should not be greater than End Time',
      );
    }

    const existingSlots = await this.recurringRepo.find({
      where: {
        doctor: { id: doctorId },
        dayOfWeek: updatedSlot.dayOfWeek,
        id: Not(id),
      },
    });

    if (hasOverlap(updatedSlot.startTime, updatedSlot.endTime, existingSlots)) {
      throw new ConflictException(
        'This slot overlaps with an existing availability',
      );
    }

    await this.recurringRepo.save(updatedSlot);
    return { data: updatedSlot };
  }

  async deleteRecurring(doctorId: string, id: string) {
    const slot = await this.recurringRepo.findOne({
      where: { id },
      relations: { doctor: true },
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    if (slot.doctor.id !== doctorId) {
      throw new NotFoundException('Slot does not exist');
    }

    await this.recurringRepo.remove(slot);

    return { message: 'Availability slot deleted successfully' };
  }

async getAvailabilityForDate(doctorId: string, date: string) {
  if (isNaN(new Date(date).getTime())) {
    throw new BadRequestException('Invalid date provided');
  }

  const custom = await this.customAvailabilityService.findByDate(doctorId, date);

  if (custom.length > 0) {
    return { data: custom, source: 'override' };
  }

  const dayOfWeek = getDayOfWeek(date);

  const recurring = await this.recurringRepo.find({
    where: { doctor: { id: doctorId }, dayOfWeek },
  });

  return { data: recurring, source: 'recurring' };
}

async getSlotsForDate(userId: string, date: string) {
  const doctorId = await this.resolveDoctorId(userId);

  const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
  if (!doctor) throw new NotFoundException('Doctor not found');

  if (!doctor.schedulingType) {
    throw new BadRequestException('Doctor has not configured a scheduling type yet');
  }

  const { data: windows } = await this.getAvailabilityForDate(doctorId, date);

  if (windows.length === 0) {
    return {
      schedulingType: doctor.schedulingType,
      message: 'No availability for this date',
    };
  }

  if (doctor.schedulingType === SchedulingType.STREAM) {
    const slots = windows.flatMap((w) =>
      generateStreamSlot(w.startTime, w.endTime, doctor.slotDuration, doctor.bufferTime),
    );
    return { schedulingType: 'stream', slots };
  }

  // add duration
  const timeWindow = windows.map((w) => ({
    duration: `${w.startTime} - ${w.endTime}`,
    capacity: doctor.maxAppointments,
    available: doctor.maxAppointments,
  }));
  return { schedulingType: 'wave', timeWindow };
}

  private async resolveDoctorId(userId: string): Promise<string> {
  const doctor = await this.doctorRepo.findOne({ where: { user: { id: userId } } });
  if (!doctor) {
    throw new NotFoundException('Doctor profile not found');
  }
  return doctor.id;
}
}
