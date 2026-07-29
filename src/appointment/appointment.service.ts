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
import { normalizeTime } from 'src/availability/utils/time.util';

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
        throw new ConflictException('This slot is already booked');
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
          throw new ConflictException('This window is full');
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

    const appointmentDate = new Date(
      `${appointment.date}T${appointment.startTime}:00`,
    );

    if (appointmentDate.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot cancel past appointments');
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
