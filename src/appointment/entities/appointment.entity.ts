import { Doctor } from '../../doctor/entities/doctor.entity';
import { Patient } from '../../patient/entities/patient.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AppointmentStatus {
  BOOKED = 'booked',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}
@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  doctor: Doctor;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ nullable: true })
  tokenNumber: number;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.BOOKED,
  })
  status: AppointmentStatus;

  @Column({ default: false })
  wasAutoReschduled: boolean;

  @Column({ type: 'date', nullable: true })
  previousDate: string;

  @Column({ type: 'time', nullable: true })
  previousStartTime: string;

  @Column({ type: 'time', nullable: true })
  previousEndTime: string;

  @CreateDateColumn()
  createdAt: Date;
}
