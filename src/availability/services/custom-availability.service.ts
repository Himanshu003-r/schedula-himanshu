import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomAvailability } from '../entities/custom-availability.entity';
import { Not, Repository } from 'typeorm';
import { CreateCustomAvailabilityDto } from '../dto/custom-dto/create-custom-availability.dto';
import { hasOverlap, isValidRange } from '../utils/time.util';
import { Doctor } from 'src/doctor/entities/doctor.entity';
import { UpdateCustomAvailabilityDto } from '../dto/custom-dto/update-custom-availability.dto';

@Injectable()
export class CustomAvailabilityService {
  constructor(
    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async createOverride(userId: string, dto: CreateCustomAvailabilityDto) {
    const { date, startTime, endTime } = dto;

    if (!isValidRange(startTime, endTime)) {
      throw new BadRequestException(
        'Start time should not be greater than end time',
      );
    }
const doctorId = await this.resolveDoctorId(userId)
    const existingSlots = await this.customRepo.find({
      where: { doctor: { id: doctorId }, date },
    });

    if (hasOverlap(startTime, endTime, existingSlots)) {
      throw new ConflictException(
        'This override overlaps with an existing custom slot',
      );
    }

    const slot = this.customRepo.create({
      date,
      startTime,
      endTime,
      doctor: { id: doctorId } as Doctor,
    });

    await this.customRepo.save(slot);
    return { data: slot };
  }

  async findAllOverrides(userId: string) {
    const doctorId = await this.resolveDoctorId(userId)
    const overrides = await this.customRepo.find({
      where: { doctor: { id: doctorId } },
    });
    return { data: overrides };
  }

  async updateOverride(
    doctorId: string,
    id: string,
    dto: UpdateCustomAvailabilityDto,
  ) {
    const slot = await this.customRepo.findOne({
      where: { id },
      relations: { doctor: true },
    });

    if (!slot) throw new NotFoundException('Override not found');
    if (slot.doctor.id !== doctorId)
      throw new NotFoundException('Override not found');

    const updatedSlot = this.customRepo.merge(slot, dto);

    if (!isValidRange(updatedSlot.startTime, updatedSlot.endTime)) {
      throw new BadRequestException(
        'Start time should not be greater than end time',
      );
    }

    const existingSlots = await this.customRepo.find({
      where: { doctor: { id: doctorId }, date: updatedSlot.date, id: Not(id) },
    });

    if (hasOverlap(updatedSlot.startTime, updatedSlot.endTime, existingSlots)) {
      throw new ConflictException(
        'This override overlaps with an existing custom slot',
      );
    }

    await this.customRepo.save(updatedSlot);
    return { data: updatedSlot };
  }

  async deleteOverride(doctorId: string, id: string) {
    const slot = await this.customRepo.findOne({
      where: { id },
      relations: { doctor: true },
    });

    if (!slot) throw new NotFoundException('Override not found');
    if (slot.doctor.id !== doctorId)
      throw new NotFoundException('Override not found');

    await this.customRepo.remove(slot);
    return { message: 'Override deleted successfully' };
  }

  async findByDate(doctorId: string, date: string) {
    const allDate = await this.customRepo.find({
      where: { doctor: { id: doctorId }, date },
    });

    return allDate;
  }

  private async resolveDoctorId(userId: string): Promise<string> {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }
    return doctor.id;
  }
}
