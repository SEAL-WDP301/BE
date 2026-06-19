import { Injectable, Logger } from "@nestjs/common";
import { Event, Team, Track } from "@prisma/client";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { GithubService } from "../../github/github.service";

export interface TeamGithubProvisionResult {
  provisioned: boolean;
  skipped: boolean;
  reason?: string;
  repoUrl?: string;
  repoName?: string;
}

@Injectable()
export class TeamGithubService {
  private readonly logger = new Logger(TeamGithubService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
  ) {}

  async provisionRepositoryForTeam(
    teamId: number,
  ): Promise<TeamGithubProvisionResult> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: true,
        track: true,
      },
    });

    if (!team) {
      return { provisioned: false, skipped: true, reason: "Team not found" };
    }

    if (team.githubRepoUrl) {
      return {
        provisioned: false,
        skipped: true,
        reason: "Repository already assigned",
        repoUrl: team.githubRepoUrl,
        repoName: team.githubRepoName ?? undefined,
      };
    }

    if (!this.githubService.isConfigured()) {
      this.logger.warn(
        `Skipping GitHub repo for team ${teamId}: GITHUB_TOKEN not configured`,
      );
      return {
        provisioned: false,
        skipped: true,
        reason: "GitHub integration not configured",
      };
    }

    const org = this.githubService.resolveOrgName(team.event.githubOrgUrl);
    if (!org) {
      this.logger.warn(
        `Skipping GitHub repo for team ${teamId}: no org URL on event and no GITHUB_ORG fallback`,
      );
      return {
        provisioned: false,
        skipped: true,
        reason: "Event has no GitHub organization configured",
      };
    }

    const repoName = this.githubService.buildRepoName(team.event, team);
    const description = this.buildRepoDescription(team.event, team, team.track);

    try {
      const created = await this.githubService.createTeamRepository({
        org,
        repoName,
        description,
      });

      const updated = await this.prisma.team.update({
        where: { id: teamId },
        data: {
          githubRepoUrl: created.htmlUrl,
          githubRepoName: created.name,
        },
      });

      this.logger.log(
        `GitHub repo created for team ${teamId}: ${created.htmlUrl}`,
      );

      return {
        provisioned: true,
        skipped: false,
        repoUrl: updated.githubRepoUrl ?? undefined,
        repoName: updated.githubRepoName ?? undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to provision GitHub repo for team ${teamId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return {
        provisioned: false,
        skipped: false,
        reason:
          error instanceof Error ? error.message : "GitHub repo creation failed",
      };
    }
  }

  private buildRepoDescription(
    event: Event,
    team: Team,
    track: Track,
  ): string {
    return `SEAL ${event.season} ${event.year} — ${team.name} (${track.name})`;
  }
}
