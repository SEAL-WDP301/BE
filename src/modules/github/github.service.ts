import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface CreatedGithubRepo {
  name: string;
  htmlUrl: string;
  cloneUrl: string;
}

interface GithubCreateRepoResponse {
  name: string;
  html_url: string;
  clone_url: string;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>("github.token"));
  }

  resolveOrgName(githubOrgUrl?: string | null): string | null {
    const fromEvent = githubOrgUrl ? this.parseOrgFromUrl(githubOrgUrl) : null;
    if (fromEvent) return fromEvent;

    const fallback = this.configService.get<string>("github.org");
    return fallback || null;
  }

  buildRepoName(
    event: { id: number; year: number; season: string },
    team: { id: number; name: string },
  ): string {
    const slug = team.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);

    const base = `seal-${event.year}-${event.season.toLowerCase()}-${slug || "team"}-t${team.id}`;
    return base.slice(0, 100);
  }

  async createTeamRepository(input: {
    org: string;
    repoName: string;
    description: string;
  }): Promise<CreatedGithubRepo> {
    const token = this.configService.get<string>("github.token");
    if (!token) {
      throw new ServiceUnavailableException(
        "GitHub integration is not configured (missing GITHUB_TOKEN)",
      );
    }

    const privateRepo = this.configService.get<boolean>("github.repoPrivate");
    const autoInit = this.configService.get<boolean>("github.autoInit");

    const response = await fetch(`https://api.github.com/orgs/${input.org}/repos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.repoName,
        description: input.description,
        private: privateRepo,
        auto_init: autoInit,
      }),
    });

    if (response.status === 422) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new BadRequestException(
        body.message || `GitHub repo "${input.repoName}" already exists or name is invalid`,
      );
    }

    if (!response.ok) {
      const body = (await response.text()).slice(0, 500);
      this.logger.error(
        `GitHub create repo failed (${response.status}): ${body}`,
      );
      throw new ServiceUnavailableException(
        `Failed to create GitHub repository (${response.status})`,
      );
    }

    const repo = (await response.json()) as GithubCreateRepoResponse;
    return {
      name: repo.name,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
    };
  }

  private parseOrgFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url.trim());
      if (parsed.hostname !== "github.com") return null;

      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length === 0) return null;

      if (segments[0] === "orgs" && segments[1]) {
        return segments[1];
      }

      return segments[0];
    } catch {
      return null;
    }
  }
}
