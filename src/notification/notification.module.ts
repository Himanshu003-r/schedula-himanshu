import { Module } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Patient } from 'src/patient/entities/patient.entity';
import { Appointment } from 'src/appointment/entities/appointment.entity';
import { RemainderService } from './services/remainder.service';

@Module({
  imports:[TypeOrmModule.forFeature([Notification,Patient,Appointment])],
  providers: [NotificationService, RemainderService],
  controllers: [NotificationController],
  exports:[NotificationService]
})
export class NotificationModule {}
