"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Fetching all Round 1 records...");
    const round1s = await prisma.round.findMany({ where: { roundNumber: 1 } });
    let count = 0;
    for (const r1 of round1s) {
        const teams = await prisma.team.findMany({
            where: {
                eventId: r1.eventId,
                teamRounds: { none: { roundId: r1.id } }
            }
        });
        if (teams.length > 0) {
            const result = await prisma.teamRound.createMany({
                data: teams.map(t => ({ teamId: t.id, roundId: r1.id })),
                skipDuplicates: true
            });
            console.log(`Event ID ${r1.eventId}: Backfilled ${result.count} teams into Round ${r1.id}`);
            count += result.count;
        }
    }
    console.log(`\nSuccess! Backfilled a total of ${count} teams into Round 1.`);
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=fix-teams.js.map