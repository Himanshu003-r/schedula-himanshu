import { User } from '../../users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum SchedulingType {
  STREAM = 'stream',
  WAVE = 'wave',
}

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  specialization: string;

  @Column({ nullable: true })
  experience: number;

  @Column({ nullable: true })
  qualification: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  consultationFee: number;

  @Column({ type: 'text', nullable: true })
  profileDetails: string;

  @Column({ type: 'enum', enum: SchedulingType, nullable: true })
  schedulingType: SchedulingType;

  @Column({ nullable: true })
  slotDuration: number;

  @Column({ nullable: true })
  bufferTime: number;

  @Column({ nullable: true })
  maxAppointments: number;
  
  @CreateDateColumn()
  createdAt: Date;
}
