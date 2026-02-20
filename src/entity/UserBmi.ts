import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_bmi' })
export class UserBmi {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  userId!: string;

  @Column({ type: 'float' })
  heightCm!: number;

  @Column({ type: 'float' })
  weightKg!: number;

  @Column({ type: 'float' })
  bmi!: number;

  @Column({ type: 'timestamptz' })
  updatedAt!: Date;
}
