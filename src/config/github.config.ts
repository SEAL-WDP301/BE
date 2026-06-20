import { registerAs } from "@nestjs/config";

export default registerAs("github", () => ({
  token: process.env.GITHUB_TOKEN || "",
  org: process.env.GITHUB_ORG || "",
  repoPrivate: process.env.GITHUB_REPO_PRIVATE !== "false",
  autoInit: process.env.GITHUB_REPO_AUTO_INIT !== "false",
}));
