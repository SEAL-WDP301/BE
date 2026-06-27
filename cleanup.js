"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const round6Id = 6;
    const round5Id = 5;
    const eliminatedTeamsInRound5 = await prisma.teamRound.findMany({
        where: {
            roundId: round5Id,
            status: { in: ['eliminated', 'competing'] }
        }
    });
    const teamIdsToRemove = eliminatedTeamsInRound5.map(tr => tr.teamId);
    const deleted = await prisma.teamRound.deleteMany({
        where: {
            roundId: round6Id,
            teamId: { in: teamIdsToRemove }
        }
    });
    console.log(`Deleted ${deleted.count} orphaned teamRound entries for round 6.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=cleanup.js.map