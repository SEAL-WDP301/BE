import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { Provider } from '../../../common/enums/provider.enum';
import { Exclude } from 'class-transformer';

/**
 * UserEntity — core user record in the database.
 *
 * Design decisions:
 * - UUID primary key (not auto-increment) for security and distributed system readiness
 * - hashedRefreshToken: stored hashed for security; allows token revocation per-user
 * - password is nullable (null for OAuth users who have no local password)
 * - googleId indexed for fast OAuth lookup
 */
@Entity('users')
@Index(['email'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;
  @Column({ nullable: true, select: false })
  @Exclude()
  password: string | null;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ unique: true, nullable: true, length: 50 })
  code: string | null;

  @Column({ nullable: true, length: 20 })
  phone: string | null;

  @ManyToOne(() => RoleEntity, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;
  @Column({
    type: 'enum',
    enum: Provider,
    default: Provider.LOCAL,
  })
  provider: Provider;

  @Column({ name: 'google_id', nullable: true, length: 100 })
  @Index()
  googleId: string | null;

  @Column({ name: 'hashed_refresh_token', nullable: true, select: false })
  @Exclude()
  hashedRefreshToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
