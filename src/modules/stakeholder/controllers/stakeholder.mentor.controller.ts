import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreateMentorFeedbackDto } from "../dto/create-mentor-feedback.dto";
import { StakeholderMentorService } from "../services/stakeholder.mentor.service";

@ApiTags("Mentor")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STAKEHOLDER)
@Controller("mentor")
export class StakeholderMentorController {
  constructor(
    private readonly stakeholderMentorService: StakeholderMentorService,
  ) {}

  @Get("teams")
  @ApiOperation({ summary: "Get teams assigned to the current mentor" })
  async getTeams(@CurrentUser("id") mentorId: number) {
    return {
      message: "Mentor teams fetched",
      data: await this.stakeholderMentorService.getTeams(mentorId),
    };
  }

  @Get("teams/:teamId")
  @ApiOperation({ summary: "Get an assigned team by ID" })
  async getTeamById(
    @CurrentUser("id") mentorId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
  ) {
    return {
      message: "Mentor team fetched",
      data: await this.stakeholderMentorService.getTeamById(mentorId, teamId),
    };
  }

  @Get("teams/:teamId/submissions")
  @ApiOperation({ summary: "Get submissions of an assigned team" })
  async getTeamSubmissions(
    @CurrentUser("id") mentorId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
  ) {
    return {
      message: "Team submissions fetched",
      data: await this.stakeholderMentorService.getTeamSubmissions(
        mentorId,
        teamId,
      ),
    };
  }

  @Get("submissions")
  @ApiOperation({ summary: "Get submissions from all assigned teams" })
  async getSubmissions(@CurrentUser("id") mentorId: number) {
    return {
      message: "Mentor submissions fetched",
      data: await this.stakeholderMentorService.getSubmissions(mentorId),
    };
  }

  @Get("submissions/:submissionId")
  @ApiOperation({ summary: "Get an assigned team's submission by ID" })
  async getSubmissionById(
    @CurrentUser("id") mentorId: number,
    @Param("submissionId", ParseIntPipe) submissionId: number,
  ) {
    return {
      message: "Mentor submission fetched",
      data: await this.stakeholderMentorService.getSubmissionById(
        mentorId,
        submissionId,
      ),
    };
  }

  @Get("feedback")
  @ApiOperation({ summary: "Get feedback created by the current mentor" })
  async getFeedback(@CurrentUser("id") mentorId: number) {
    return {
      message: "Mentor feedback fetched",
      data: await this.stakeholderMentorService.getFeedback(mentorId),
    };
  }

  @Post("submissions/:submissionId/feedback")
  @ApiOperation({
    summary: "Create feedback for an assigned team's submission",
  })
  async createFeedback(
    @CurrentUser("id") mentorId: number,
    @Param("submissionId", ParseIntPipe) submissionId: number,
    @Body() dto: CreateMentorFeedbackDto,
  ) {
    return {
      message: "Mentor feedback created",
      data: await this.stakeholderMentorService.createFeedback(
        mentorId,
        submissionId,
        dto,
      ),
    };
  }

  @Patch("feedback/:feedbackId")
  @ApiOperation({ summary: "Update feedback created by the current mentor" })
  async updateFeedback(
    @CurrentUser("id") mentorId: number,
    @Param("feedbackId", ParseIntPipe) feedbackId: number,
    @Body() dto: CreateMentorFeedbackDto,
  ) {
    return {
      message: "Mentor feedback updated",
      data: await this.stakeholderMentorService.updateFeedback(
        mentorId,
        feedbackId,
        dto,
      ),
    };
  }

  @Delete("feedback/:feedbackId")
  @ApiOperation({ summary: "Delete feedback created by the current mentor" })
  async deleteFeedback(
    @CurrentUser("id") mentorId: number,
    @Param("feedbackId", ParseIntPipe) feedbackId: number,
  ) {
    await this.stakeholderMentorService.deleteFeedback(mentorId, feedbackId);
    return { message: "Mentor feedback deleted", data: null };
  }
}
