import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting 06-score-round2.ts...");

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
    const round2 = latestEvent.rounds.find(r => r.roundNumber === 2);

    if (!round1 || !round2) {
        console.error("Missing Round 1 or Round 2.");
        return;
    }



    // 3. Score Round 2 Submissions
    const assignments = await prisma.judgeAssignment.findMany({
        where: { roundId: round2.id, trackId: null },
        include: { judge: true }
    });

    if (assignments.length === 0) {
        console.error("No judges assigned to Round 2. Please run 03-assign-judges.ts first.");
        return;
    }

    const submissions = await prisma.submission.findMany({
        where: { roundId: round2.id }
    });

    const criteria = await prisma.criterion.findMany({
        where: { roundId: round2.id, trackId: null }
    });

    if (criteria.length === 0) {
        console.error("No criteria found for Round 2. Run 04-generate-rubrics.ts first.");
        return;
    }

    for (const sub of submissions) {
        for (const assignment of assignments) {
            for (const crit of criteria) {
                // Idempotency check
                const existingScore = await prisma.score.findFirst({
                    where: {
                        submissionId: sub.id,
                        judgeId: assignment.judgeId,
                        criterionId: crit.id
                    }
                });

                if (existingScore) {
                    console.log(`Judge ${assignment.judge.email} already scored Team ${sub.teamId} on criterion '${crit.name}' in R2. Skipping.`);
                    continue;
                }

                const randomScore = Math.floor(Math.random() * (crit.maxScore + 1));
                
                await prisma.score.create({
                    data: {
                        submissionId: sub.id,
                        judgeId: assignment.judgeId,
                        criterionId: crit.id,
                        scoreValue: randomScore,
                        comment: `Final Round automated feedback: Score ${randomScore}/${crit.maxScore}`
                    }
                });
                console.log(`Judge ${assignment.judge.email} scored Team ${sub.teamId} on '${crit.name}': ${randomScore} (R2)`);
            }
        }
    }

    console.log("Successfully scored Round 2.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
