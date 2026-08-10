import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from 'src/doctor/entities/doctor.entity';
import { Patient } from 'src/patient/entities/patient.entity';
import { AvailabilityModule } from 'src/availability/availability.module';
import { NotificationModule } from 'src/notification/notification.module';


@Module({
  imports:[TypeOrmModule.forFeature([Appointment,Doctor,Patient]),AvailabilityModule,NotificationModule],
  providers: [AppointmentService],
  controllers: [AppointmentController]
})
export class AppointmentModule {}
