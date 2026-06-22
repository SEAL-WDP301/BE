import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { MentorFeedbackService } from "../services/mentor-feedback.service";

@ApiTags("Mentor Feedback")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STAKEHOLDER)
@Controller("mentor")
export class MentorFeedbackController {
  constructor(private readonly mentorFeedbackService: MentorFeedbackService) {}

  @Get("feedback")
  @ApiOperation({ summary: "Get feedback created by the current mentor" })
  async getFeedback(@CurrentUser("id") mentorId: number) {
    return {
      message: "Mentor feedback fetched",
      data: await this.mentorFeedbackService.findAllByMentor(mentorId),
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
      data: await this.mentorFeedbackService.create(
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
      data: await this.mentorFeedbackService.update(mentorId, feedbackId, dto),
    };
  }

  @Delete("feedback/:feedbackId")
  @ApiOperation({ summary: "Delete feedback created by the current mentor" })
  async deleteFeedback(
    @CurrentUser("id") mentorId: number,
    @Param("feedbackId", ParseIntPipe) feedbackId: number,
  ) {
    await this.mentorFeedbackService.remove(mentorId, feedbackId);
    return { message: "Mentor feedback deleted", data: null };
  }
}
