import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type JobType = 'cron' | 'every' | 'at';

@Entity()
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  instruction: string;

  @Column({ type: 'varchar', length: 25 })
  type: JobType;

  @Column({ type: 'varchar', length: 25, nullable: true })
  cron: string;

  @Column({ type: 'varchar', length: 25, nullable: true })
  every: string;

  @Column({ type: 'varchar', length: 25, nullable: true })
  at: string;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ type: 'timestamp' })
  lastRunAt: Date;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;
}
