import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async run() {
    console.log('--- Starting Database Seeding ---');

    // Seed Default Admin User
    const adminEmail = 'admin@seal.com';
    
    // Find if user already exists with the same email
    let adminUser = await this.prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);

      adminUser = await this.prisma.user.create({
        data: {
          email: adminEmail,
          name: 'System Administrator',
          passwordHash: hashedPassword,
          role: Role.admin,
        }
      });
      console.log(`[User] Default admin user created: ${adminEmail} (password: Admin@123)`);
    } else {
      console.log(`[User] Default admin user already exists: ${adminEmail}`);
    }

    console.log('--- Database Seeding Completed ---');
  }
}
