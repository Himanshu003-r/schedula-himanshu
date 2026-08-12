import { Module } from '@nestjs/common';
import {  RecurringAvailabilityController } from './controllers/recurring-availability.controller';
import { RecurringAvailability } from './entities/recurring-availability.entity';
import { CustomAvailabilityService } from './services/custom-availability.service';
import { CustomAvailabilityController } from './controllers/custom-availability.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomAvailability } from './entities/custom-availability.entity';
import { RecurringAvailabilityService } from './services/recurring-availability.service';
import { Doctor } from 'src/doctor/entities/doctor.entity';
import { Appointment } from 'src/appointment/entities/appointment.entity';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports:[TypeOrmModule.forFeature([RecurringAvailability,CustomAvailability,Doctor,Appointment]),NotificationModule],
  providers: [RecurringAvailabilityService,CustomAvailabilityService],
  controllers: [RecurringAvailabilityController,CustomAvailabilityController],
  exports: [RecurringAvailabilityService, CustomAvailabilityService]
})
export class AvailabilityModule {}
