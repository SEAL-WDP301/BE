import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../modules/user/entities/user.entity';
import { RoleEntity } from '../../modules/user/entities/role.entity';
import { Role } from '../../common/enums/role.enum';
import { Provider } from '../../common/enums/provider.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async run() {
    console.log('--- Starting Database Seeding ---');

    // 1. Seed Roles
    const rolesToSeed = Object.values(Role); // ['participant', 'examinator', 'supportor', 'admin']
    const seededRoles: Record<string, RoleEntity> = {};

    for (const roleName of rolesToSeed) {
      let role = await this.roleRepository.findOne({ where: { name: roleName } });
      if (!role) {
        role = this.roleRepository.create({ name: roleName });
        role = await this.roleRepository.save(role);
        console.log(`[Role] Created role: ${roleName}`);
      } else {
        console.log(`[Role] Role already exists: ${roleName}`);
      }
      seededRoles[roleName] = role;
    }

    // 2. Seed Default Admin User
    const adminEmail = 'admin@seal.com';
    const adminCode = 'ADMIN001';
    
    // Find if user already exists with either the same email or the same employee code
    let adminUser = await this.userRepository.findOne({
      where: [
        { email: adminEmail },
        { code: adminCode }
      ]
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      const adminRole = seededRoles[Role.ADMIN];

      if (!adminRole) {
        throw new Error('Admin role not found. Cannot create admin user.');
      }

      adminUser = this.userRepository.create({
        email: adminEmail,
        fullName: 'System Administrator',
        password: hashedPassword,
        role: adminRole,
        provider: Provider.LOCAL,
        code: 'ADMIN001',
      });

      await this.userRepository.save(adminUser);
      console.log(`[User] Default admin user created: ${adminEmail} (password: Admin@123)`);
    } else {
      console.log(`[User] Default admin user already exists: ${adminEmail}`);
    }

    console.log('--- Database Seeding Completed ---');
  }
}
