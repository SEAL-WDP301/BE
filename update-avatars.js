const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { avatarUrl: null },
        { avatarUrl: '' }
      ]
    }
  });

  let count = 0;
  for (const u of users) {
    let seed = u.role + '_' + u.id;
    let style = 'adventurer-neutral';
    
    if (u.role === 'student') style = 'micah';
    if (u.role === 'stakeholder') style = 'adventurer';
    if (u.role === 'organizer') style = 'avataaars';
    
    let url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
    
    await prisma.user.update({
      where: { id: u.id },
      data: { avatarUrl: url }
    });
    count++;
  }
  
  console.log(`Updated ${count} users without avatars.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
