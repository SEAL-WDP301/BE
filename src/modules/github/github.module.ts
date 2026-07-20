import { Module } from '@nestjs/common';
import { GithubWebhookController } from './controllers/github.webhook.controller';
import { GithubWebhookService } from './services/github.webhook.service';
import { EventModule } from '../event/event.module';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { GithubModule as CoreGithubModule } from '../../core/github/github.module';

@Module({
  imports: [EventModule, PrismaModule, CoreGithubModule],
  controllers: [GithubWebhookController],
  providers: [GithubWebhookService],
})
export class GithubModule {}
