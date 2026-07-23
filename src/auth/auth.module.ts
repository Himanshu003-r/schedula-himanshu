import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './startegies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow('JWT_SECRET_EXPIRES_IN'),
        },
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,
    RolesGuard,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
