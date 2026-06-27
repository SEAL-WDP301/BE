const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    where: { githubRepoUrl: { not: null } },
    include: {
      leader: { include: { studentProfile: true } },
      members: { include: { user: { include: { studentProfile: true } } } },
    },
  });

  const summary = teams.map(t => {
    const leaderGithub = t.leader?.studentProfile?.githubUsername;
    const membersGithub = t.members.map(m => m.user?.studentProfile?.githubUsername);
    return {
      id: t.id,
      name: t.name,
      repo: t.githubRepoUrl,
      leaderGithub,
      membersGithub,
    };
  });

  console.log(JSON.stringify(summary, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
