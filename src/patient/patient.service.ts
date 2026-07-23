import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { Repository } from 'typeorm';
import { CreatePatientDto } from './dto/create-patient.dto';
import { User } from 'src/users/entities/user.entity';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  async createPatient(userId: string, dto: CreatePatientDto) {
    const existingPatient = await this.patientRepo.findOne({
      where: { user: { id: userId } },
    });

    if (existingPatient) {
      throw new ConflictException('Patient already exists');
    }

    const patient = this.patientRepo.create({
      ...dto,
      user: { id: userId } as User,
    });

    await this.patientRepo.save(patient);

    return {
      data: patient,
    };
  }

  async updatePatient(userId: string, dto: UpdatePatientDto) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    this.patientRepo.merge(patient, dto);
    await this.patientRepo.save(patient);

    return { data: patient };
  }

  async findByUserId(userId: string) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: userId } }
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

     const savedPatient = await this.patientRepo.findOne({
      where: { id: patient.id },
      relations: { user: true },
      select: {
        id: true,
        age: true,
        gender: true,
        weight: true,
        phoneNumber: true,
        createdAt: true,
        user: {
          name: true,
          email: true,
        }
      }
    });
    return { data: savedPatient };
  }
}
