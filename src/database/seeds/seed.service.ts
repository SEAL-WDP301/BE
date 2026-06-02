import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Season, EventStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async run() {
    console.log('--- Starting Database Seeding ---');
    const adminEmail = 'admin@gmail.com';
    let adminUser = await this.prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('12345678', 10);

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

    await this.seedEvents(adminUser.id);

    console.log('--- Database Seeding Completed ---');
  }

  private async seedEvents(adminId: number) {
    const existingEventsCount = await this.prisma.event.count();
    if (existingEventsCount > 0) {
      console.log('[Event] Events already exist. Skipping event seeding.');
      return;
    }

    console.log('[Event] Seeding 6 past events...');

    const eventsData = [
      {
        name: 'Spring Hackathon 2024',
        description: 'A 48-hour coding marathon focused on AI and Web3 technologies.',
        season: Season.Spring,
        year: 2024,
        status: EventStatus.closed,
        registrationDeadline: new Date('2024-03-01T00:00:00Z'),
        startDate: new Date('2024-03-10T00:00:00Z'),
        githubOrgUrl: 'https://github.com/spring-hack-2024',
        prize1st: '$5000',
        prize2nd: '$2500',
        prize3rd: '$1000',
        tracks: [
          { name: 'Web3 & Blockchain', description: 'Build decentralized applications', maxTeams: 50, maxMembersPerTeam: 4 },
          { name: 'AI & Machine Learning', description: 'Create smart solutions using AI', maxTeams: 50, maxMembersPerTeam: 5 }
        ]
      },
      {
        name: 'Summer Innovation Bootcamp 2024',
        description: 'An intensive bootcamp focusing on disruptive technologies in multiple sectors.',
        season: Season.Summer,
        year: 2024,
        status: EventStatus.closed,
        registrationDeadline: new Date('2024-06-15T00:00:00Z'),
        startDate: new Date('2024-07-01T00:00:00Z'),
        prize1st: '$10000',
        prize2nd: '$5000',
        tracks: [
          { name: 'FinTech', description: 'Financial technology innovations', maxTeams: 30, maxMembersPerTeam: 4 },
          { name: 'HealthTech', description: 'Improving healthcare through tech', maxTeams: 30, maxMembersPerTeam: 4 },
          { name: 'EdTech', description: 'Future of education', maxTeams: 30, maxMembersPerTeam: 4 }
        ]
      },
      {
        name: 'Fall CodeFest 2024',
        description: 'Celebrate the end of the year with creative game development and security challenges.',
        season: Season.Fall,
        year: 2024,
        status: EventStatus.closed,
        registrationDeadline: new Date('2024-10-01T00:00:00Z'),
        startDate: new Date('2024-10-15T00:00:00Z'),
        prize1st: '$3000',
        tracks: [
          { name: 'GameFi', description: 'Play-to-earn game development', maxTeams: 40, maxMembersPerTeam: 3 },
          { name: 'Cybersecurity', description: 'Secure the future', maxTeams: 40, maxMembersPerTeam: 3 }
        ]
      },
      {
        name: 'Spring AI Challenge 2025',
        description: 'Pushing the boundaries of Generative AI and Robotics.',
        season: Season.Spring,
        year: 2025,
        status: EventStatus.closed,
        registrationDeadline: new Date('2025-02-28T00:00:00Z'),
        startDate: new Date('2025-03-15T00:00:00Z'),
        prize1st: '$8000',
        tracks: [
          { name: 'Generative AI', description: 'LLMs, Image generation, and beyond', maxTeams: 60, maxMembersPerTeam: 4 },
          { name: 'Robotics', description: 'Software for autonomous robots', maxTeams: 20, maxMembersPerTeam: 5 }
        ]
      },
      {
        name: 'Global Tech Arena Summer 2025',
        description: 'A global competition focusing on IoT and E-commerce.',
        season: Season.Summer,
        year: 2025,
        status: EventStatus.closed,
        registrationDeadline: new Date('2025-06-20T00:00:00Z'),
        startDate: new Date('2025-07-10T00:00:00Z'),
        prize1st: '$15000',
        tracks: [
          { name: 'Internet of Things (IoT)', description: 'Connected devices', maxTeams: 40, maxMembersPerTeam: 4 },
          { name: 'E-commerce Next Gen', description: 'Reinventing online shopping', maxTeams: 40, maxMembersPerTeam: 4 }
        ]
      },
      {
        name: 'FPT Developer Challenge Fall 2025',
        description: 'The ultimate challenge for enterprise solutions and mobile applications.',
        season: Season.Fall,
        year: 2025,
        status: EventStatus.closed,
        registrationDeadline: new Date('2025-09-30T00:00:00Z'),
        startDate: new Date('2025-10-20T00:00:00Z'),
        prize1st: '$12000',
        tracks: [
          { name: 'Enterprise Software', description: 'B2B solutions', maxTeams: 50, maxMembersPerTeam: 5 },
          { name: 'Mobile Apps', description: 'Consumer mobile experiences', maxTeams: 50, maxMembersPerTeam: 4 }
        ]
      }
    ];

    for (const data of eventsData) {
      const { tracks, ...eventDetails } = data;
      await this.prisma.event.create({
        data: {
          ...eventDetails,
          createdById: adminId,
          tracks: {
            create: tracks,
          }
        }
      });
    }

    console.log('[Event] Successfully seeded 6 past events with tracks.');
  }
}
