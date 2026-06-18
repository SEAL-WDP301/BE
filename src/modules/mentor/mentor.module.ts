import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { MentorController } from "./controllers/mentor.controller";
import { MentorService } from "./services/mentor.service";

@Module({
  imports: [PrismaModule],
  controllers: [MentorController],
  providers: [MentorService],
})
export class MentorModule {}
