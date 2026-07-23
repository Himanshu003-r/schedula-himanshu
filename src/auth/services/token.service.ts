import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken (payload: JwtPayload): Promise<string>{
   return this.jwtService.signAsync(payload,{
    secret: this.configService.getOrThrow('JWT_SECRET'),
    expiresIn: this.configService.getOrThrow('JWT_SECRET_EXPIRES_IN')
   })
  }
}