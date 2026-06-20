import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Initiates GitHub OAuth and processes the callback.
 */
@Injectable()
export class GithubOAuthGuard extends AuthGuard("github") {}
