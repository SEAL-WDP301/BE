import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { FeedbackGateway } from "../../feedback/gateways/feedback.gateway";

@Injectable()
export class StakeholderMentorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedbackGateway: FeedbackGateway
  ) {}

  async getTeams(mentorId: number) {
    return this.prisma.team.findMany({
      where: {
        mentorAssignments: { some: { mentorId } },
      },
      include: this.teamInclude(),
      orderBy: { createdAt: "desc" },
    });
  }

  async getTeamById(mentorId: number, teamId: number) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        mentorAssignments: { some: { mentorId } },
      },
      include: this.teamInclude(),
    });

    if (!team) {
      throw new NotFoundException("Assigned team not found");
    }

    return team;
  }

  async getTeamSubmissions(mentorId: number, teamId: number) {
    await this.ensureAssignedTeam(mentorId, teamId);

    return this.prisma.submission.findMany({
      where: { teamId },
      include: this.submissionInclude(mentorId),
      orderBy: { submittedAt: "desc" },
    });
  }

  async getSubmissions(mentorId: number) {
    return this.prisma.submission.findMany({
      where: {
        team: {
          mentorAssignments: { some: { mentorId } },
        },
      },
      include: this.submissionInclude(mentorId),
      orderBy: { submittedAt: "desc" },
    });
  }

  async getSubmissionById(mentorId: number, submissionId: number) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        team: {
          mentorAssignments: { some: { mentorId } },
        },
      },
      include: this.submissionInclude(mentorId),
    });

    if (!submission) {
      throw new NotFoundException("Assigned team submission not found");
    }

    return submission;
  }

  async createFeedback(mentorId: number, submissionId: number, content: string) {
    const submission = await this.prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException("Submission not found");
    await this.ensureAssignedTeam(mentorId, submission.teamId);
    const feedback = await this.prisma.mentorFeedback.create({
      data: {
        mentorId,
        teamId: submission.teamId,
        submissionId,
        content,
        status: "unread",
      }
    });
    this.feedbackGateway.notifyFeedbackUpdated(submission.teamId);
    return feedback;
  }

  async updateFeedback(mentorId: number, feedbackId: number, content: string) {
    const feedback = await this.prisma.mentorFeedback.findFirst({ where: { id: feedbackId, mentorId } });
    if (!feedback) throw new NotFoundException("Feedback not found");
    const updated = await this.prisma.mentorFeedback.update({
      where: { id: feedbackId },
      data: { content }
    });
    this.feedbackGateway.notifyFeedbackUpdated(feedback.teamId);
    return updated;
  }

  async deleteFeedback(mentorId: number, feedbackId: number) {
    const feedback = await this.prisma.mentorFeedback.findFirst({ where: { id: feedbackId, mentorId } });
    if (!feedback) throw new NotFoundException("Feedback not found");
    await this.prisma.mentorFeedback.delete({ where: { id: feedbackId } });
    this.feedbackGateway.notifyFeedbackUpdated(feedback.teamId);
    return feedback;
  }

  private async ensureAssignedTeam(mentorId: number, teamId: number) {
    const assignment = await this.prisma.mentorAssignment.findUnique({
      where: {
        mentorId_teamId: { mentorId, teamId },
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new NotFoundException("Assigned team not found");
    }
  }

  private teamInclude() {
    return {
      event: true,
      track: true,
      leader: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          studentProfile: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              studentProfile: true,
            },
          },
        },
      },
      teamRounds: {
        include: { round: true },
      },
      _count: {
        select: { submissions: true },
      },
    };
  }

  private submissionInclude(mentorId: number) {
    return {
      team: {
        include: {
          event: true,
          track: true,
        },
      },
      round: true,
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      mentorFeedbacks: {
        where: { mentorId },
        orderBy: { createdAt: "desc" as const },
      },
    };
  }
}
