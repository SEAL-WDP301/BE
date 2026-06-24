import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from "@nestjs/swagger";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { SubmitProjectDto } from "../dto/submit-project.dto";
import { UpdateFeedbackStatusDto } from "../dto/update-feedback-status.dto";
import { SubmissionStudentService } from "../services/submission.student.service";

@ApiTags("Student/Teams")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller("student/teams")
export class SubmissionStudentController {
  constructor(private readonly submissionStudentService: SubmissionStudentService) {}

  @Post("my-team/submissions")
  @ApiOperation({ summary: "Submit project for a round" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async submitProject(
    @CurrentUser("id") userId: string,
    @Body() dto: SubmitProjectDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const submission = await this.submissionStudentService.submitProject(
      Number(userId),
      dto,
      file,
    );
    return { message: "Project submitted successfully", data: submission };
  }

  @Patch("my-team/feedbacks/:feedbackId/status")
  @ApiOperation({ summary: "Update mentor feedback status by student" })
  async updateFeedbackStatus(
    @CurrentUser("id") userId: string,
    @Param("feedbackId") feedbackId: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    const feedback = await this.submissionStudentService.updateFeedbackStatus(
      Number(userId),
      Number(feedbackId),
      dto.status,
    );
    return { message: "Feedback status updated", data: feedback };
  }
}
