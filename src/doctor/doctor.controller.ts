import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/users/entities/user.entity';
import { DoctorService } from './doctor.service';
import { currentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { SetSchedulingConfigDto } from './dto/set-scheduling-config.dto';

@Controller('doctor/profile')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.DOCTOR)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  create(@currentUser() user: JwtPayload, @Body() dto: CreateDoctorDto) {
    return this.doctorService.createDoctor(user.sub, dto);
  }

  @Patch()
  update(@currentUser() user: JwtPayload, @Body() dto: UpdateDoctorDto) {
    return this.doctorService.updateDoctor(user.sub, dto);
  }

  @Get()
  get(@currentUser() user: JwtPayload) {
    return this.doctorService.findByUserId(user.sub);
  }

  @Patch('scheduling-config')
  setSchedulingConfig(@currentUser() user: JwtPayload, @Body() dto: SetSchedulingConfigDto) {
    return this.doctorService.setSchedulingConfig(user.sub, dto);
  }
}
