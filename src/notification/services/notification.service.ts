import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { EntityManager, Repository } from 'typeorm';
import { Patient } from 'src/patient/entities/patient.entity';
import { Appointment } from 'src/appointment/entities/appointment.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  async create(
    manager: EntityManager,
    patientId: string,
    appointmentId: string,
    type: NotificationType,
    referenceDate: string,
    referenceStartTime: string,
    title: string,
    message: string
  ) {
    const notification = manager.create(Notification, {
      patient: { id: patientId } as Patient,
      appointment: { id: appointmentId } as Appointment,
      type,
      referenceDate,
      referenceStartTime,
      title,
      message
    });

    return manager.save(notification);
  }

  async createDirect(
    patientId: string,
    appointmentId: string,
    type: NotificationType,
    referenceDate: string,
    referenceStartTime: string,
    title: string,
    message: string,
    reminderOffsetMinutes?: number
  ){
    const notification = this.notificationRepo.create({
      patient: {id: patientId} as Patient,
      appointment: {id: appointmentId} as Appointment,
      type,
      referenceDate,
      referenceStartTime,
      title,
      message,
      reminderOffsetMinutes
    })

    return this.notificationRepo.save(notification)
  }

  async getAllNotifications(userId: string) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    return this.notificationRepo.find({
      where: { patient: { id: patient.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!patient) {
      throw new NotFoundException('Patient does not exist');
    }

    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, patient: { id: patient.id } },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    notification.isRead = true;
    await this.notificationRepo.save(notification);
    return { data: notification };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!patient) {
      throw new NotFoundException('Patient does not exist');
    }

    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, patient: { id: patient.id } },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    await this.notificationRepo.delete(notification.id);

    return { message: 'Notification deleted successfully!' };
  }
}
