import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting 05-score-round1.ts...");

    const latestEvent = await prisma.event.findFirst({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        include: { rounds: true }
    });

    if (!latestEvent) {
        console.error("No active event found.");
        return;
    }

    const round1 = latestEvent.rounds.find(r => r.roundNumber === 1);
    if (!round1) {
        console.error("Round 1 not found.");
        return;
    }

    // Get all judge assignments for Round 1
    const assignments = await prisma.judgeAssignment.findMany({
        where: { roundId: round1.id },
        include: { judge: true }
    });

    if (assignments.length === 0) {
        console.error("No judges assigned to Round 1. Please run 03-assign-judges.ts first.");
        return;
    }

    for (const assignment of assignments) {
        if (!assignment.trackId) continue; // Round 1 is track-specific

        // Find all submissions in this track for Round 1
        const submissions = await prisma.submission.findMany({
            where: {
                roundId: round1.id,
                team: { trackId: assignment.trackId }
            }
        });

        // Find criteria for this track in Round 1
        const criteria = await prisma.criterion.findMany({
            where: {
                roundId: round1.id,
                trackId: assignment.trackId
            }
        });

        if (criteria.length === 0) {
            console.error(`No criteria found for track ID ${assignment.trackId}. Run 04-generate-rubrics.ts first.`);
            continue;
        }

        for (const sub of submissions) {
            for (const crit of criteria) {
                // Idempotency: Has this judge already scored this submission for this criterion?
                const existingScore = await prisma.score.findFirst({
                    where: {
                        submissionId: sub.id,
                        judgeId: assignment.judgeId,
                        criterionId: crit.id
                    }
                });

                if (existingScore) {
                    console.log(`Judge ${assignment.judge.email} already scored Team ${sub.teamId} on criterion '${crit.name}'. Skipping.`);
                    continue;
                }

                // Generate random score between 0 and maxScore
                const randomScore = Math.floor(Math.random() * (crit.maxScore + 1));
                
                await prisma.score.create({
                    data: {
                        submissionId: sub.id,
                        judgeId: assignment.judgeId,
                        criterionId: crit.id,
                        scoreValue: randomScore,
                        comment: `Automated testing feedback: Score ${randomScore}/${crit.maxScore}`
                    }
                });
                console.log(`Judge ${assignment.judge.email} scored Team ${sub.teamId} on '${crit.name}': ${randomScore}`);
            }
        }
    }

    console.log("Successfully scored Round 1.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
