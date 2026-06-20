ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "github_repo_url" TEXT;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "github_repo_name" TEXT;
