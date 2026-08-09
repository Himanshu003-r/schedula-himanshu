import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CustomAvailabilityService } from '../services/custom-availability.service';
import { CreateCustomAvailabilityDto } from '../dto/custom-dto/create-custom-availability.dto';
import { UpdateCustomAvailabilityDto } from '../dto/custom-dto/update-custom-availability.dto';
import { UserRole } from 'src/users/entities/user.entity';
import { currentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Controller('doctor/availability/override')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.DOCTOR)
export class CustomAvailabilityController {
  constructor(private readonly customService: CustomAvailabilityService) {}

  @Post()
  create(@currentUser() user: JwtPayload, @Body() dto: CreateCustomAvailabilityDto) {
    return this.customService.createOverride(user.sub, dto);
  }

  @Get()
  findAll(@currentUser() user: JwtPayload) {
    return this.customService.findAllOverrides(user.sub);
  }

  @Patch('/expand/:id')
  update(@currentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateCustomAvailabilityDto) {
    return this.customService.updateOverride(user.sub, id, dto);
  }

  @Patch('/shrink/:id')
  updateShrink(@currentUser() user:JwtPayload, @Param('id') id:string, @Body() dto: UpdateCustomAvailabilityDto){
    return this.customService.shrinkCustomAvailability(user.sub,id,dto)
  }

  @Delete(':id')
  remove(@currentUser() user: JwtPayload, @Param('id') id: string) {
    return this.customService.deleteOverride(user.sub, id);
  }
}