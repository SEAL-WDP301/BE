import { Injectable, NotFoundException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { RoleEntity } from '../entities/role.entity';
import { Provider } from '../../../common/enums/provider.enum';
import { Role } from '../../../common/enums/role.enum';
import { hashPassword } from '../../../common/utils/hash.util';
import { MESSAGES } from '../../../common/constants/messages.constant';

/**
 * CreateUserData — internal type for creating users from different sources.
 */
interface CreateUserData {
  email: string;
  fullName: string;
  password: string | null;
  provider: Provider;
  googleId?: string;
  role?: Role;
  code?: string;
  phone?: string;
}

/**
 * UserService — data access layer for UserEntity.
 *
 * All database operations for users go through this service.
 * AuthService depends on UserService — not directly on the repository.
 * This enforces the layered architecture and keeps concerns separated.
 */
@Injectable()
export class UserService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  /**
   * Auto-seed a default Admin user if the database is empty.
   * Runs automatically on NestJS application bootstrap.
   */
  async onApplicationBootstrap(): Promise<void> {
    // 1. Seed Roles
    const roles = Object.values(Role);
    for (const roleName of roles) {
      const roleExists = await this.roleRepository.findOne({ where: { name: roleName } });
      if (!roleExists) {
        const newRole = this.roleRepository.create({ name: roleName });
        await this.roleRepository.save(newRole);
        this.logger.log(`Seeded role: ${roleName}`);
      }
    }

    // 2. Seed default Admin User
    const adminEmail = 'admin@admin.com';
    const adminExists = await this.userRepository.findOne({ where: { email: adminEmail } });

    if (!adminExists) {
      this.logger.log('Default Admin user not found. Seeding default Admin user...');
      
      const plainPassword = 'admin123';
      const hashedPassword = await hashPassword(plainPassword);

      const adminRole = await this.roleRepository.findOne({ where: { name: Role.ADMIN } });

      const defaultAdmin = this.userRepository.create({
        email: adminEmail,
        fullName: 'System Admin',
        password: hashedPassword,
        provider: Provider.LOCAL,
        role: adminRole,
        code: 'ADMIN001',
        phone: '0999999999',
      });

      await this.userRepository.save(defaultAdmin);
      this.logger.log(`Default Admin user seeded successfully!`);
      this.logger.log(`Credentials -> Email: ${adminEmail} | Password: ${plainPassword}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // READ operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Find user by ID. Returns null if not found.
   * Used by JwtStrategy.validate() on every authenticated request.
   */
  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Find user by email. Returns null if not found.
   * Used for login and duplicate email check during signup.
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Find user by email WITH password field included.
   * Password has select: false on the column — must explicitly add it.
   * Only called during signin flow.
   */
  async findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }
  /**
   * Find user by ID WITH hashedRefreshToken field included.
   * Used during token refresh flow to validate stored token hash.
   */
  async findByIdWithRefreshToken(id: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.hashed_refresh_token')
      .where('user.id = :id', { id })
      .getOne();
  }

  /**
   * Find user by Google ID. Used in Google OAuth flow.
   */
  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }
  // ─────────────────────────────────────────────────────────────────────────────
  // WRITE operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new user record.
   * Accepts both LOCAL (with password) and GOOGLE (without password) users.
   */
  async createUser(data: CreateUserData): Promise<UserEntity> {
    const roleName = data.role ?? Role.PARTICIPANT;
    const roleEntity = await this.roleRepository.findOne({ where: { name: roleName } });

    const user = this.userRepository.create({
      email: data.email,
      fullName: data.fullName,
      password: data.password,
      provider: data.provider,
      googleId: data.googleId ?? null,
      role: roleEntity,
      code: data.code ?? null,
      phone: data.phone ?? null,
    });

    return this.userRepository.save(user);
  }

  /**
   * Update the hashed refresh token for a user.
   * Called after every login/refresh. Set to null on logout (revokes token).
   *
   * @param userId - User's UUID
   * @param refreshToken - Raw refresh token to hash, or null to clear
   */
  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedToken = refreshToken
      ? await hashPassword(refreshToken)
      : null;

    await this.userRepository.update(userId, {
      hashedRefreshToken: hashedToken,
    });
  }

  /**
   * Get user profile by ID. Throws NotFoundException if not found.
   * Used by UserController for GET /users/profile.
   */
  async getProfile(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }
}
