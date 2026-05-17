import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Role } from '../../../common/enums/role.enum';
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

  /**
   * Nullable: OAuth users (Google) may not have a local password.
   * Always stored as bcrypt hash — NEVER plain text.
   */
  @Column({ nullable: true, select: false })
  @Exclude()
  password: string | null;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  /**
   * Authentication provider: LOCAL (email/password) or GOOGLE (OAuth2).
   */
  @Column({
    type: 'enum',
    enum: Provider,
    default: Provider.LOCAL,
  })
  provider: Provider;

  /**
   * Google OAuth2 user ID — null for LOCAL users.
   */
  @Column({ name: 'google_id', nullable: true, length: 100 })
  @Index()
  googleId: string | null;

  /**
   * Bcrypt hash of the current refresh token.
   * Null if user is logged out (token revoked).
   * Storing hash (not raw token) prevents token theft from DB compromise.
   */
  @Column({ name: 'hashed_refresh_token', nullable: true, select: false })
  @Exclude()
  hashedRefreshToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
