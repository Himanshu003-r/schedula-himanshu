import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/entities/user.entity';
import { currentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointment')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.PATIENT)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post('book')
  post(@currentUser() user: JwtPayload, @Body() dto: CreateAppointmentDto) {
    return this.appointmentService.book(user.sub, dto);
  }

  @Get('me')
  get(@currentUser() user: JwtPayload) {
    return this.appointmentService.findAppointment(user.sub);
  }

  @Delete(':id')
  cancel(@currentUser() user: JwtPayload, @Param('id') id: string) {
    return this.appointmentService.cancel(user.sub, id);
  }

  @Roles(UserRole.DOCTOR)
  @Get('doctor')
  getDoctor(@currentUser() user: JwtPayload) {
    return this.appointmentService.findDoctorAppointment(user.sub);
  }
}
