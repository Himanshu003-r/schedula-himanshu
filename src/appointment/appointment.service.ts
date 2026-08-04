import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { DataSource, Not, Repository } from 'typeorm';
import { Doctor, SchedulingType } from 'src/doctor/entities/doctor.entity';
import { Patient } from 'src/patient/entities/patient.entity';
import { RecurringAvailabilityService } from 'src/availability/services/recurring-availability.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  addOneDay,
  isWithinCutoff,
  normalizeTime,
} from 'src/availability/utils/time.util';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly recurringService: RecurringAvailabilityService,
    private readonly dataSource: DataSource,
  ) {}

  async book(userId: string, dto: CreateAppointmentDto) {
    const patientId = await this.resolvePatientId(userId);

    const doctor = await this.doctorRepo.findOne({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor Profile does not exist');
    }

    const appointmentDateTime = new Date(`${dto.date}T${dto.startTime}:00`);

    if (appointmentDateTime.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot book an appointment in the past');
    }

    if (doctor.schedulingType === SchedulingType.STREAM) {
      const { slots } = await this.recurringService.getSlotsForDoctorId(
        dto.doctorId,
        dto.date,
      );

      const matchedSlots = slots?.some(
        (s) =>
          normalizeTime(s.startTime) === dto.startTime &&
          normalizeTime(s.endTime) === dto.endTime,
      );

      if (!matchedSlots) {
        throw new BadRequestException('Invalid slot for this date/doctor');
      }

      const existingSlot = await this.appointmentRepo.findOne({
        where: {
          doctor: { id: dto.doctorId },
          date: dto.date,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: Not(AppointmentStatus.CANCELLED),
        },
      });

      if (existingSlot) {
        const suggestion = await this.findNextAvailable(
          doctor.id,
          dto.date,
          doctor.schedulingType,
        );
        throw new ConflictException({
          message: 'This slot is already booked',
          suggestedSlot: suggestion, 
        });
      }

      const apppointment = this.appointmentRepo.create({
        doctor: { id: dto.doctorId } as Doctor,
        patient: { id: patientId } as Patient,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
      });

      await this.appointmentRepo.save(apppointment);
      return {
        data: apppointment,
      };
    }

    if (doctor.schedulingType === SchedulingType.WAVE) {
      return this.dataSource.transaction(async (manager) => {
        const { timeWindows } = await this.recurringService.getSlotsForDoctorId(
          dto.doctorId,
          dto.date,
        );

        const matchesWindow = timeWindows?.some((w) => {
          const [winStart, winEnd] = w.duration.split(' - ').map(normalizeTime);
          return winStart === dto.startTime && winEnd === dto.endTime;
        });

        if (!matchesWindow) {
          throw new BadRequestException(
            'Invalid time window for this doctor/date',
          );
        }

        const existingCount = await manager.count(Appointment, {
          where: {
            doctor: { id: dto.doctorId },
            date: dto.date,
            startTime: dto.startTime,
            endTime: dto.endTime,
            status: Not(AppointmentStatus.CANCELLED),
          },
        });

        if (existingCount >= doctor.maxAppointments) {
          const suggestion = await this.findNextAvailable(
            doctor.id,
            dto.date,
            doctor.schedulingType,
          );
          throw new ConflictException({
            message: 'This slot is already booked',
            suggestedSlot: suggestion, 
          });
        }

        const appointment = manager.create(Appointment, {
          doctor: { id: dto.doctorId } as Doctor,
          patient: { id: patientId } as Patient,
          date: dto.date,
          startTime: dto.startTime,
          endTime: dto.endTime,
          tokenNumber: existingCount + 1,
        });

        await manager.save(appointment);
        return { data: appointment };
      });
    }
  }

  async findAppointment(userId: string) {
    const patientId = await this.resolvePatientId(userId);

    const appointment = await this.appointmentRepo.find({
      where: { patient: { id: patientId } },
      relations: { doctor: { user: true } },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        tokenNumber: true,
        doctor: {
          id: true,
          specialization: true,
          user: {
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      data: appointment,
    };
  }

  async cancel(userId: string, appointmentId: string) {
    const patientId = await this.resolvePatientId(userId);

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { patient: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment does not exist');
    }

    if (appointment?.patient.id !== patientId) {
      throw new ForbiddenException('Patient id mismatch');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    // const appointmentDate = new Date(
    //   `${appointment.date}T${appointment.startTime}:00`,
    // );

    // if (appointmentDate.getTime() <= Date.now()) {
    //   throw new BadRequestException('Cannot cancel past appointments');
    // }

    if (isWithinCutoff(appointment.date, appointment.startTime)) {
      throw new BadRequestException(
        'Cannot cancel within 30 minutes of the appointment',
      );
    }

    appointment.status = AppointmentStatus.CANCELLED;
    await this.appointmentRepo.save(appointment);

    return {
      message: 'Appointment cancelled successfully',
      data: appointment,
    };
  }

  async findDoctorAppointment(userId: string) {
    const doctorId = await this.resolveDoctorId(userId);

    const appointments = await this.appointmentRepo.find({
      where: { doctor: { id: doctorId } },
      relations: { patient: { user: true } },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        tokenNumber: true,
        patient: {
          id: true,
          age: true,
          gender: true,
          phoneNumber: true,
          user: {
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      data: appointments,
    };
  }

  async reschdule(
    userId: string,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
  ) {
    const patientId = await this.resolvePatientId(userId);

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { patient: true, doctor: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment does not exist');
    }

    if (appointment.patient.id !== patientId) {
      throw new NotFoundException('Appointment does not exist');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot reschedule a cancelled appointment',
      );
    }

    if (isWithinCutoff(appointment.date, appointment.startTime)) {
      throw new BadRequestException(
        'Cannot reschedule within 30 minutes of the appointment',
      );
    }

    const newDateTime = new Date(`${dto.date}T${dto.startTime}:00`);
    if (newDateTime.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot reschedule to a past time');
    }

    const isSameSlot =
      appointment.date === dto.date &&
      normalizeTime(appointment.startTime) === dto.startTime &&
      normalizeTime(appointment.endTime) === dto.endTime;
    if (isSameSlot) {
      throw new BadRequestException('This is already your current slot');
    }

    const doctor = appointment.doctor;

    if (doctor.schedulingType === SchedulingType.STREAM) {
      return this.dataSource.transaction(async (manager) => {
        const { slots } = await this.recurringService.getSlotsForDoctorId(
          doctor.id,
          dto.date,
        );

        const matchesGeneratedSlot = slots?.some(
          (s) =>
            normalizeTime(s.startTime) === dto.startTime &&
            normalizeTime(s.endTime) === dto.endTime,
        );
        if (!matchesGeneratedSlot) {
          throw new BadRequestException('Invalid slot for this doctor/date');
        }

        const conflicting = await this.appointmentRepo.findOne({
          where: {
            doctor: { id: doctor.id },
            date: dto.date,
            startTime: dto.startTime,
            status: Not(AppointmentStatus.CANCELLED),
            id: Not(appointment.id),
          },
        });

        if (conflicting) {
          const suggestion = await this.findNextAvailable(
            doctor.id,
            dto.date,
            doctor.schedulingType,
          );
          throw new ConflictException({
            message: 'This slot is already booked',
            suggestedSlot: suggestion,
          });
        }

        appointment.date = dto.date;
        appointment.startTime = dto.startTime;
        appointment.endTime = dto.endTime;
        await manager.save(appointment);

        return { data: appointment };
      });
    }

    if (doctor.schedulingType === SchedulingType.WAVE) {
      return this.dataSource.transaction(async (manager) => {
        const { timeWindows } = await this.recurringService.getSlotsForDoctorId(
          doctor.id,
          dto.date,
        );

        const matchesWindow = timeWindows?.some((w) => {
          const [winStart, winEnd] = w.duration.split(' - ').map(normalizeTime);
          return winStart === dto.startTime && winEnd === dto.endTime;
        });

        if (!matchesWindow) {
          throw new BadRequestException(
            'Invalid time slot for this date/doctor',
          );
        }

        const existingCount = await manager.count(Appointment, {
          where: {
            doctor: { id: doctor.id },
            date: dto.date,
            startTime: dto.startTime,
            endTime: dto.endTime,
            status: Not(AppointmentStatus.CANCELLED),
            id: Not(appointment.id),
          },
        });

        if (existingCount >= doctor.maxAppointments) {
          const suggestion = await this.findNextAvailable(
            doctor.id,
            dto.date,
            doctor.schedulingType,
          );
          throw new ConflictException({
            message: 'This slot is already booked',
            suggestedSlot: suggestion, 
          });
        }

        appointment.date = dto.date;
        appointment.startTime = dto.startTime;
        appointment.endTime = dto.endTime;
        appointment.tokenNumber = existingCount + 1;
        await manager.save(appointment);

        return { data: appointment };
      });
    }
  }

  async findNextAvailable(
    doctorId: string,
    fromDate: string,
    schedulingType: SchedulingType,
    maxDaysToCheck = 14,
  ) {
    let checkDate = fromDate;

    for (let i = 0; i < maxDaysToCheck; i++) {
      const result = await this.recurringService.getSlotsForDoctorId(
        doctorId,
        checkDate,
      );

      if (schedulingType === SchedulingType.STREAM && result.slots?.length) {
        for (const slot of result.slots) {
          const conflicting = await this.appointmentRepo.findOne({
            where: {
              doctor: { id: doctorId },
              date: checkDate,
              startTime: slot.startTime,
              status: Not(AppointmentStatus.CANCELLED),
            },
          });
          if (!conflicting) {
            return {
              date: checkDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
            };
          }
        }
      }

      if (
        schedulingType === SchedulingType.WAVE &&
        result.timeWindows?.length
      ) {
        for (const window of result.timeWindows) {
          const [start, end] = window.duration.split(' - ').map(normalizeTime);
          const count = await this.appointmentRepo.count({
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
          if (count < (doctor?.maxAppointments ?? 0)) {
            return { date: checkDate, startTime: start, endTime: end };
          }
        }
      }

      checkDate = addOneDay(checkDate); 
    }

    return null; // nothing found within the lookahead window
  }

  private async resolvePatientId(userId: string): Promise<string> {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }
    return patient.id;
  }

  private async resolveDoctorId(userId: string): Promise<string> {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!doctor) {
      throw new NotFoundException('Patient profile not found');
    }
    return doctor.id;
  }
}
