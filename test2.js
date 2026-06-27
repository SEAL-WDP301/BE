const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const round = await prisma.round.findFirst({
    where: { submissionType: 'github_link' }
  });
  if (!round) {
    console.log("No github round found.");
    return;
  }
  
  const teamRounds = await prisma.teamRound.findMany({
    where: { roundId: round.id },
    include: { team: true }
  });

  console.log(`Teams in round ${round.name} (${round.submissionType}):`);
  teamRounds.forEach(tr => {
    console.log(`- Team ${tr.team.name} (ID: ${tr.teamId}): status=${tr.status}, repo=${tr.team.githubRepoUrl}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
