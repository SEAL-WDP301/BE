import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';

/**
 * HealthController — provides system health status for monitoring.
 *
 * GET /health → checks DB connection, Redis connection, and process uptime.
 * Used by load balancers and monitoring tools (e.g., Docker healthcheck).
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check system health status' })
  @ApiResponse({
    status: 200,
    description: 'System health report',
    schema: {
      example: {
        success: true,
        status: 'ok',
        database: 'connected',
        redis: 'connected',
        uptime: 123.45,
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  async check() {
    // ─── Database Health ─────────────────────────────────────────────────────
    let databaseStatus = 'disconnected';
    try {
      await this.dataSource.query('SELECT 1');
      databaseStatus = 'connected';
    } catch {
      databaseStatus = 'error';
    }

    // ─── Redis Health ─────────────────────────────────────────────────────────
    const isRedisConnected = await this.redisService.ping();
    const redisStatus = isRedisConnected ? 'connected' : 'disconnected';

    // ─── Overall Status ───────────────────────────────────────────────────────
    const isHealthy =
      databaseStatus === 'connected' && isRedisConnected;

    return {
      message: isHealthy ? 'All systems operational' : 'Some systems degraded',
      data: {
        status: isHealthy ? 'ok' : 'degraded',
        database: databaseStatus,
        redis: redisStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
