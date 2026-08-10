import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/entities/user.entity';
import { currentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Controller('notification')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.PATIENT)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  get(@currentUser() user: JwtPayload) {
    return this.notificationService.getAllNotifications(user.sub);
  }

  @Patch(':id')
  read(@currentUser() user: JwtPayload, @Param('id') id: string){
   return this.notificationService.markAsRead(user.sub, id)
  }
}
