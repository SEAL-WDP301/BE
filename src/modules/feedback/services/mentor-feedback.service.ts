import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CreateMentorFeedbackDto } from "../dto/create-mentor-feedback.dto";

@Injectable()
export class MentorFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByMentor(mentorId: number) {
    return this.prisma.mentorFeedback.findMany({
      where: {
        mentorId,
        team: {
          mentorAssignments: { some: { mentorId } },
        },
      },
      include: this.feedbackInclude(),
      orderBy: { createdAt: "desc" },
    });
  }

  async create(
    mentorId: number,
    submissionId: number,
    dto: CreateMentorFeedbackDto,
  ) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        team: {
          mentorAssignments: { some: { mentorId } },
        },
      },
      select: { id: true, teamId: true },
    });

    if (!submission) {
      throw new NotFoundException("Assigned team submission not found");
    }

    return this.prisma.mentorFeedback.create({
      data: {
        mentorId,
        teamId: submission.teamId,
        submissionId: submission.id,
        content: dto.content.trim(),
      },
      include: this.feedbackInclude(),
    });
  }

  async update(
    mentorId: number,
    feedbackId: number,
    dto: CreateMentorFeedbackDto,
  ) {
    await this.ensureOwnedFeedback(mentorId, feedbackId);

    return this.prisma.mentorFeedback.update({
      where: { id: feedbackId },
      data: { content: dto.content.trim() },
      include: this.feedbackInclude(),
    });
  }

  async remove(mentorId: number, feedbackId: number) {
    await this.ensureOwnedFeedback(mentorId, feedbackId);
    return this.prisma.mentorFeedback.delete({ where: { id: feedbackId } });
  }

  private async ensureOwnedFeedback(mentorId: number, feedbackId: number) {
    const feedback = await this.prisma.mentorFeedback.findFirst({
      where: {
        id: feedbackId,
        mentorId,
        team: {
          mentorAssignments: { some: { mentorId } },
        },
      },
      select: { id: true },
    });

    if (!feedback) {
      throw new NotFoundException("Mentor feedback not found");
    }
  }

  private feedbackInclude() {
    return {
      team: {
        include: {
          event: true,
          track: true,
        },
      },
      submission: {
        include: {
          round: true,
        },
      },
    };
  }
}
