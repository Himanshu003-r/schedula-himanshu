import { User } from '../../users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @CreateDateColumn()
  createdAt: Date;
}
