import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from './entities/doctor.entity';
import { Repository } from 'typeorm';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { User } from 'src/users/entities/user.entity';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async createDoctor(userId: string, dto: CreateDoctorDto) {
    const existingDoctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (existingDoctor) {
      throw new ConflictException('Doctor profile already exists');
    }

    const doctor = this.doctorRepo.create({
      ...dto,
      user: { id: userId } as User,
    });

    await this.doctorRepo.save(doctor);

    return { data: doctor };
  }

  async findByUserId(userId: string) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
      select: {
        id: true,
        specialization: true,
        experience: true,
        qualification: true,
        consultationFee: true,
        profileDetails: true,
        createdAt: true,
        user: { name: true, email: true },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return { data: doctor };
  }

  async updateDoctor(userId: string, dto: UpdateDoctorDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    this.doctorRepo.merge(doctor, dto);
    await this.doctorRepo.save(doctor);

    return { data: doctor };
  }
}
