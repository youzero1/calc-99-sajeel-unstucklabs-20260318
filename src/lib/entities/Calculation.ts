import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('calculations')
export class Calculation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  expression!: string;

  @Column({ type: 'text' })
  result!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
