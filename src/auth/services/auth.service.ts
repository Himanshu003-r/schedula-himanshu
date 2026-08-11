import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { SignUpUserDto } from '../dto/signup.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { LoginUserDto } from '../dto/login.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async signUp(signUpDto: SignUpUserDto) {
    const { email, name, password, role } = signUpDto;

    const existingUser = await this.userRepo.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await this.passwordService.hashPassword(password);

    const user = this.userRepo.create({
      name,
      email,
      password: hashedPassword,
      role,
    });
    await this.userRepo.save(user);

    return {
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: 'User registered successfully',
    };
  }

  async login(loginDto: LoginUserDto) {
    const { email, password } = loginDto;

    const user = await this.userRepo.findOne({
      where: { email },
      select:{
        password: true
      }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.tokenService.generateAccessToken(payload);

    return {
      accessToken,
    };
  }
}
