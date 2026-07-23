import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/users/entities/user.entity';
import { PatientService } from './patient.service';
import { currentUser } from 'src/auth/decorators/current-user.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Controller('patient/profile')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.PATIENT)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  create(@currentUser() user: JwtPayload, @Body() dto: CreatePatientDto) {
    return this.patientService.createPatient(user.sub, dto);
  }

  @Patch()
  update(@currentUser() user: JwtPayload, @Body() dto: UpdatePatientDto) {
    return this.patientService.updatePatient(user.sub, dto);
  }

  @Get()
  get(@currentUser() user: JwtPayload) {
    return this.patientService.findByUserId(user.sub);
  }
}
