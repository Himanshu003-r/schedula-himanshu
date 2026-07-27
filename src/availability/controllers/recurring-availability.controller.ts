import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/users/entities/user.entity';
import { RecurringAvailabilityService } from '../services/recurring-availability.service';
import { currentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CreateRecurringAvailabilityDto } from '../dto/recurring-dto/create-recurring-availability.dto';
import { UpdateRecurringAvailabilityDto } from '../dto/recurring-dto/update-recurring-availability.dto';

@Controller('doctor/availability')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.DOCTOR)
export class RecurringAvailabilityController {
  constructor(
    private readonly recurringService: RecurringAvailabilityService,
  ) {}

  @Post()
  create(
    @currentUser() user: JwtPayload,
    @Body() dto: CreateRecurringAvailabilityDto,
  ) {
    return this.recurringService.createRecurring(user.sub, dto);
  }

  @Get()
  findAll(@currentUser() user: JwtPayload) {
    return this.recurringService.findAllRecurring(user.sub);
  }

  @Patch(':id')
  update(
    @currentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringAvailabilityDto,
  ) {
    return this.recurringService.updateRecurring(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@currentUser() user: JwtPayload, @Param('id') id: string) {
    return this.recurringService.deleteRecurring(user.sub, id);
  }

  @Get('date')
  getForDate(@currentUser() user: JwtPayload, @Query('date') date: string) {
    return this.recurringService.getAvailabilityForDate(user.sub, date);
  }

  @Get('slots')
  getSlots(@currentUser() user: JwtPayload, @Query('date') date: string) {
    return this.recurringService.getSlotsForDate(user.sub, date);
  }
}
