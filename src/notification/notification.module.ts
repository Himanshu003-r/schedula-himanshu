import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Patient } from 'src/patient/entities/patient.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Notification,Patient])],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports:[NotificationService]
})
export class NotificationModule {}
