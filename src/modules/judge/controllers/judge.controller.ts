import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JudgeService } from "../services/judge.service";
import { SubmitScoresDto } from "../dto/submit-scores.dto";

@ApiTags("Judge")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STAKEHOLDER, Role.ADMIN)
@Controller("judge")
export class JudgeController {
  constructor(private readonly judgeService: JudgeService) {}

  @Get("events")
  @ApiOperation({ summary: "Get events and rounds assigned to the judge" })
  async getAssignedEvents(@CurrentUser("id") userId: string) {
    const events = await this.judgeService.getAssignedEvents(Number(userId));
    return { message: "Assigned events fetched", data: events };
  }

  @Get("rounds/:roundId/submissions")
  @ApiOperation({ summary: "List submissions to evaluate in a round" })
  async getRoundSubmissions(
    @CurrentUser("id") userId: string,
    @Param("roundId", ParseIntPipe) roundId: number,
  ) {
    const submissions = await this.judgeService.getRoundSubmissions(
      Number(userId),
      roundId,
    );
    return { message: "Submissions fetched", data: submissions };
  }

  @Get("submissions/:submissionId")
  @ApiOperation({
    summary: "Get submission detail with rubrics and current judge scores",
  })
  async getSubmissionDetail(
    @CurrentUser("id") userId: string,
    @Param("submissionId", ParseIntPipe) submissionId: number,
  ) {
    const submission = await this.judgeService.getSubmissionDetail(
      Number(userId),
      submissionId,
    );
    return { message: "Submission detail fetched", data: submission };
  }

  @Put("submissions/:submissionId/scores")
  @ApiOperation({ summary: "Submit or update scores for a submission" })
  async submitScores(
    @CurrentUser("id") userId: string,
    @Param("submissionId", ParseIntPipe) submissionId: number,
    @Body() dto: SubmitScoresDto,
  ) {
    const result = await this.judgeService.submitScores(
      Number(userId),
      submissionId,
      dto,
    );
    return { message: "Scores saved successfully", data: result };
  }
}
