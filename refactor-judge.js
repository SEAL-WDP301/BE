const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// 1. Create EventJudgeService
const eventJudgeServiceCode = `import { Injectable } from "@nestjs/common";
import { RoundStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";

@Injectable()
export class EventJudgeService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssignedEvents(judgeId: number) {
    const assignments = await this.prisma.judgeAssignment.findMany({
      where: { judgeId },
      include: {
        round: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                season: true,
                year: true,
                status: true,
              },
            },
          },
        },
        track: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ round: { eventId: "desc" } }, { round: { roundNumber: "asc" } }],
    });

    const eventsMap = new Map<
      number,
      {
        id: number;
        name: string;
        season: string;
        year: number;
        status: string;
        rounds: Array<{
          assignmentId: number;
          roundId: number;
          roundNumber: number;
          roundName: string;
          roundStatus: RoundStatus;
          trackId: number | null;
          trackName: string | null;
        }>;
      }
    >();

    for (const assignment of assignments) {
      const event = assignment.round.event;
      if (!eventsMap.has(event.id)) {
        eventsMap.set(event.id, {
          id: event.id,
          name: event.name,
          season: event.season,
          year: event.year,
          status: event.status,
          rounds: [],
        });
      }

      eventsMap.get(event.id)!.rounds.push({
        assignmentId: assignment.id,
        roundId: assignment.roundId,
        roundNumber: assignment.round.roundNumber,
        roundName: assignment.round.name,
        roundStatus: assignment.round.status,
        trackId: assignment.trackId,
        trackName: assignment.track?.name ?? null,
      });
    }

    return Array.from(eventsMap.values());
  }
}
`;
fs.writeFileSync(path.join(srcDir, 'modules/event/services/event.judge.service.ts'), eventJudgeServiceCode);

// 2. Create EventJudgeController
const eventJudgeControllerCode = `import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { EventJudgeService } from "../services/event.judge.service";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("Judge/Events")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STAKEHOLDER, Role.ADMIN)
@Controller("judge/events")
export class EventJudgeController {
  constructor(private readonly eventJudgeService: EventJudgeService) {}

  @Get()
  @ApiOperation({ summary: "Get events and rounds assigned to the judge" })
  async getAssignedEvents(@CurrentUser("id") userId: string) {
    const events = await this.eventJudgeService.getAssignedEvents(Number(userId));
    return { message: "Assigned events fetched", data: events };
  }
}
`;
fs.writeFileSync(path.join(srcDir, 'modules/event/controllers/event.judge.controller.ts'), eventJudgeControllerCode);

// 3. Update EventModule
const eventModulePath = path.join(srcDir, 'modules/event/event.module.ts');
let eventModuleCode = fs.readFileSync(eventModulePath, 'utf8');
eventModuleCode = eventModuleCode.replace(
  'import { EventPublicService } from "./services/event.public.service";',
  'import { EventPublicService } from "./services/event.public.service";\nimport { EventJudgeController } from "./controllers/event.judge.controller";\nimport { EventJudgeService } from "./services/event.judge.service";'
);
eventModuleCode = eventModuleCode.replace(
  'EventPublicController,\n  ],',
  'EventPublicController,\n    EventJudgeController,\n  ],'
);
eventModuleCode = eventModuleCode.replace(
  'EventPublicService,\n    CriterionService,',
  'EventPublicService,\n    EventJudgeService,\n    CriterionService,'
);
fs.writeFileSync(eventModulePath, eventModuleCode);

// 4. Update SubmissionJudgeService
const submissionServicePath = path.join(srcDir, 'modules/submission/services/submission.judge.service.ts');
let subSvcCode = fs.readFileSync(submissionServicePath, 'utf8');
// rename class
subSvcCode = subSvcCode.replace('export class JudgeService {', 'export class SubmissionJudgeService {');
// remove getAssignedEvents (lines 24 to 93)
const startIdx = subSvcCode.indexOf('  async getAssignedEvents');
const endIdx = subSvcCode.indexOf('  async getRoundSubmissions');
if(startIdx !== -1 && endIdx !== -1) {
  subSvcCode = subSvcCode.slice(0, startIdx) + subSvcCode.slice(endIdx);
}
fs.writeFileSync(submissionServicePath, subSvcCode);

// 5. Update SubmissionJudgeController
const submissionCtrlPath = path.join(srcDir, 'modules/submission/controllers/submission.judge.controller.ts');
let subCtrlCode = fs.readFileSync(submissionCtrlPath, 'utf8');
subCtrlCode = subCtrlCode.replace('import { JudgeService } from "../services/judge.service";', 'import { SubmissionJudgeService } from "../services/submission.judge.service";');
subCtrlCode = subCtrlCode.replace('export class JudgeController {', 'export class SubmissionJudgeController {');
subCtrlCode = subCtrlCode.replace('constructor(private readonly judgeService: JudgeService) {}', 'constructor(private readonly judgeService: SubmissionJudgeService) {}');
subCtrlCode = subCtrlCode.replace('@ApiTags("Judge")', '@ApiTags("Judge/Submissions")');
// remove getAssignedEvents from controller
const ctrlStartIdx = subCtrlCode.indexOf('  @Get("events")');
const ctrlEndIdx = subCtrlCode.indexOf('  @Get("rounds/:roundId/submissions")');
if(ctrlStartIdx !== -1 && ctrlEndIdx !== -1) {
  subCtrlCode = subCtrlCode.slice(0, ctrlStartIdx) + subCtrlCode.slice(ctrlEndIdx);
}
fs.writeFileSync(submissionCtrlPath, subCtrlCode);

// 6. Update SubmissionModule
const subModulePath = path.join(srcDir, 'modules/submission/submission.module.ts');
let subModCode = fs.readFileSync(subModulePath, 'utf8');
subModCode = subModCode.replace('import { JudgeController } from "./controllers/judge.controller";', 'import { SubmissionJudgeController } from "./controllers/submission.judge.controller";');
subModCode = subModCode.replace('import { JudgeService } from "./services/judge.service";', 'import { SubmissionJudgeService } from "./services/submission.judge.service";');
subModCode = subModCode.replace('export class JudgeModule {}', 'export class SubmissionModule {}');
subModCode = subModCode.replace('JudgeController', 'SubmissionJudgeController');
subModCode = subModCode.replace('JudgeService', 'SubmissionJudgeService');
fs.writeFileSync(subModulePath, subModCode);

// 7. Update AppModule
const appModulePath = path.join(srcDir, 'app.module.ts');
let appModCode = fs.readFileSync(appModulePath, 'utf8');
appModCode = appModCode.replace('import { JudgeModule } from "./modules/judge/judge.module";', 'import { SubmissionModule } from "./modules/submission/submission.module";');
appModCode = appModCode.replace('    JudgeModule,', '    SubmissionModule,');
fs.writeFileSync(appModulePath, appModCode);

// 8. Delete judge folder
fs.rmSync(path.join(srcDir, 'modules/judge'), { recursive: true, force: true });

console.log("Refactoring complete");
