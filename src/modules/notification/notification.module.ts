import { Module } from "@nestjs/common";
import { NotificationController } from "./controllers/notification.controller";
import { NotificationService } from "./services/notification.service";
import { PrismaModule } from "../../database/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
