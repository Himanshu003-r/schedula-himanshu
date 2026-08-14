import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Appointment,
  AppointmentStatus,
} from 'src/appointment/entities/appointment.entity';
import { Not, Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedulingType } from 'src/doctor/entities/doctor.entity';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class RemainderService {
  private readonly logger = new Logger(RemainderService.name);
  private readonly reminderOffsetMinutes = [60, 30];

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendReminder() {
    const now = new Date();

    const appointment = await this.appointmentRepo.find({
      where: { status: Not(AppointmentStatus.CANCELLED) },
      relations: { patient: true, doctor: { user: true } },
    });

    let remindersSent = 0;
    for (const appt of appointment) {
      if (appt.status === AppointmentStatus.COMPLETED) continue;
      // Invalid or Incomplete data guard
      if (!appt.date || !appt.startTime) continue;
      // Checking for valid date and time
      const apptDateTime = new Date(`${appt.date}T${appt.startTime}`);
      if (isNaN(apptDateTime.getTime())) continue;

      const doctor = appt.doctor;
      if (!doctor) continue;

      for (const offset of this.reminderOffsetMinutes) {
        // setting the offset of 60, 30 mins from appoitment time
        const triggerTime = new Date(apptDateTime.getTime() - offset * 60 * 1000);
        // Tolerance window 
        const windowEnd = new Date(triggerTime.getTime() + 60 * 1000);

        if (now < triggerTime || now > windowEnd) continue;

        const doctorName = doctor.user?.name ?? 'your doctor';
        const title = 'Appointment Reminder';
        const message =
          doctor.schedulingType === SchedulingType.WAVE
            ? `Reminder: You have an appointment with Dr. ${doctorName} on ${appt.date} at ${appt.startTime}.`
            : `Reminder: You have an appointment with Dr. ${doctorName} today. Reporting Time: ${appt.startTime}. Token Number: ${appt.tokenNumber}.`;

        try {
          await this.notificationService.createDirect(
            appt.patient.id,
            appt.id,
            NotificationType.APPOINTMENT_REMINDER,
            appt.date,
            appt.startTime,
            title,
            message,
            offset
          );
          remindersSent++;
        } catch (err) {
          // this.logger.debug(`Reminder already exists for appointment ${appt.id}, skipping`);
          this.logger.error(`Failed to create reminder for appointment ${appt.id}: ${err.message}`);
        }
      }
    }
    this.logger.log(`Reminder job complete: ${remindersSent} reminder(s) sent, ${appointment.length} appointment(s) checked`);
  }
}
