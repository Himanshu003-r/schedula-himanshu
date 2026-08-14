import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomAvailability } from '../entities/custom-availability.entity';
import { DataSource, Not, Repository } from 'typeorm';
import { CreateCustomAvailabilityDto } from '../dto/custom-dto/create-custom-availability.dto';
import {
  addOneDay,
  getRemovedChunks,
  hasOverlap,
  isValidRange,
  isWithinChunk,
  normalizeTime,
  toMinutes,
} from '../utils/time.util';
import { Doctor, SchedulingType } from 'src/doctor/entities/doctor.entity';
import { UpdateCustomAvailabilityDto } from '../dto/custom-dto/update-custom-availability.dto';
import {
  Appointment,
  AppointmentStatus,
} from 'src/appointment/entities/appointment.entity';
import { RecurringAvailabilityService } from './recurring-availability.service';
import { RecurringAvailability } from '../entities/recurring-availability.entity';
import { NotificationService } from 'src/notification/services/notification.service';
import { NotificationType } from 'src/notification/entities/notification.entity';

@Injectable()
export class CustomAvailabilityService {
  constructor(
    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(RecurringAvailability)
    private readonly recuringRepo: Repository<RecurringAvailability>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => RecurringAvailabilityService))
    private readonly recurringService: RecurringAvailabilityService,
    private readonly notificationService: NotificationService,
  ) {}

  async createOverride(userId: string, dto: CreateCustomAvailabilityDto) {
    const { date, startTime, endTime } = dto;

    if (!isValidRange(startTime, endTime)) {
      throw new BadRequestException(
        'Start time should not be greater than end time',
      );
    }
    const doctorId = await this.resolveDoctorId(userId);
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
    const doctorId = await this.resolveDoctorId(userId);
    const overrides = await this.customRepo.find({
      where: { doctor: { id: doctorId } },
    });
    return { data: overrides };
  }

  async updateOverride(
    userId: string,
    id: string,
    dto: UpdateCustomAvailabilityDto,
  ) {
    const doctorId = await this.resolveDoctorId(userId);
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

  async shrinkCustomAvailability(
    userId: string,
    id: string,
    dto: UpdateCustomAvailabilityDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const doctorId = await this.resolveDoctorId(userId);

      const slots = await this.customRepo.findOne({
        where: { id },
        relations: { doctor: true },
      });

      if (!slots) {
        throw new NotFoundException('Availability slot not found');
      }

      if (slots.doctor.id !== doctorId) {
        throw new NotFoundException('Slot does not exist');
      }

      const oldStartTime = slots.startTime;
      const oldEndTime = slots.endTime;
      const newStartTime = dto.startTime ?? oldStartTime;
      const newEndTime = dto.endTime ?? oldEndTime;

      const chunks = getRemovedChunks(
        oldStartTime,
        oldEndTime,
        newStartTime,
        newEndTime,
      );

      const affectedAppointments = await this.findAffectedSlots(
        doctorId,
        slots.date,
        oldStartTime,
        oldEndTime,
        newStartTime,
        newEndTime,
      );

      const reassignment: {
        appointmentId: string;
        newDate: string;
        newStartTime: string;
        newEndTime: string;
      }[] = [];

      for (const appt of affectedAppointments) {
        const nextSlot = await this.findNearestSlotForReassignment(
          doctorId,
          appt.date,
          normalizeTime(appt.startTime),
          slots.doctor.schedulingType,
          reassignment.map((r) => ({
            date: r.newDate,
            startTime: r.newStartTime,
          })),
          chunks,
          slots.date,
          14,
        );

        if (!nextSlot) {
          throw new ConflictException(
            `Cannot shrink: no available slot found to reassign appointment ${appt.id}`,
          );
        }

        reassignment.push({
          appointmentId: appt.id,
          newDate: nextSlot.date,
          newStartTime: nextSlot.startTime,
          newEndTime: nextSlot.endTime,
        });
      }

      for (const r of reassignment) {
        const appt = affectedAppointments.find(
          (a) => a.id === r.appointmentId,
        )!;
        appt.previousDate = appt.date;
        appt.previousStartTime = appt.startTime;
        appt.previousEndTime = appt.endTime;
        appt.wasAutoReschduled = true;
        appt.date = r.newDate;
        appt.startTime = r.newStartTime;
        appt.endTime = r.newEndTime;
        await manager.save(appt);

        await this.notificationService.create(
          manager,
          appt.patient.id,
          appt.id,
          NotificationType.APPOINTMENT_RESCHEDULED,
          r.newDate,
          r.newStartTime,
          'Appointment Rescheduled',
          `Your appointment has been rescheduled to ${r.newDate} at ${r.newStartTime}.`,
        );
      }

      manager.merge(CustomAvailability, slots, dto);
      await manager.save(slots);

      return { data: slots, reassignedAppointments: reassignment };
    });
  }

  async findAffectedSlots(
    doctorId: string,
    date: string,
    oldStartTime: string,
    oldEndTime: string,
    newStartTime: string,
    newEndTime: string,
  ) {
    // const doctorId = await this.resolveDoctorId(userId);

    const chunks = getRemovedChunks(
      oldStartTime,
      oldEndTime,
      newStartTime,
      newEndTime,
    );
    if (chunks.length === 0) return [];

    const appointments = await this.appointmentRepo.find({
      where: {
        doctor: { id: doctorId },
        date,
        status: Not(AppointmentStatus.CANCELLED),
      },
      relations:{patient: true}
    });

    return appointments.filter((appt) =>
      chunks.some((chunk) =>
        isWithinChunk(normalizeTime(appt.startTime), chunk),
      ),
    );
  }

  async findNearestSlotForReassignment(
    doctorId: string,
    fromDate: string,
    fromTime: string,
    schedulingType: SchedulingType,
    alreadyReserved: { date: string; startTime: string }[],
    removedChunks: { start: string; end: string }[],
    anchorDate: string,
    maxDaysToCheck = 14,
  ) {
    let checkDate = fromDate;

    for (let day = 0; day < maxDaysToCheck; day++) {
      const result = await this.recurringService.getSlotsForDoctorId(
        doctorId,
        checkDate,
      );

      if (
        schedulingType === SchedulingType.STREAM &&
        result.timeWindows?.length
      ) {
        for (const window of result.timeWindows) {
          const [start, end] = window.duration.split(' - ').map(normalizeTime);
          if (checkDate === fromDate && toMinutes(start) <= toMinutes(fromTime))
            continue;

          const reservedCountThisOp = alreadyReserved.filter(
            (r) => r.date === checkDate && r.startTime === start,
          ).length;

          const existingCount = await this.appointmentRepo.count({
            where: {
              doctor: { id: doctorId },
              date: checkDate,
              startTime: start,
              status: Not(AppointmentStatus.CANCELLED),
            },
          });

          const doctor = await this.doctorRepo.findOne({
            where: { id: doctorId },
          });
          if (
            existingCount + reservedCountThisOp <
            (doctor?.maxAppointments ?? 0)
          ) {
            return { date: checkDate, startTime: start, endTime: end };
          }
        }
      }

      if (schedulingType === SchedulingType.WAVE && result.slots?.length) {
        for (const slot of result.slots) {
          // on the anchor day skiping anything at or before the original time
          if (
            checkDate === fromDate &&
            toMinutes(slot.startTime) <= toMinutes(fromTime)
          )
            continue;
          // preventing from allocating the shrink slots
          if (
            checkDate === anchorDate &&
            removedChunks.some((c) => isWithinChunk(slot.startTime, c))
          ) {
            continue;
          }

          const reservedCountThisOp = alreadyReserved.filter(
            (r) => r.date === checkDate && r.startTime === slot.startTime,
          ).length;
          if (reservedCountThisOp) continue;

          const existingCount = await this.appointmentRepo.count({
            where: {
              doctor: { id: doctorId },
              date: checkDate,
              startTime: slot.startTime,
              status: Not(AppointmentStatus.CANCELLED),
            },
          });

          const doctor = await this.doctorRepo.findOne({
            where: { id: doctorId },
          });
          if (
            existingCount + reservedCountThisOp <
            (doctor?.maxAppointments ?? 0)
          ) {
            return {
              date: checkDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
            };
          }
        }
      }

      checkDate = addOneDay(checkDate);
    }

    return null;
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
