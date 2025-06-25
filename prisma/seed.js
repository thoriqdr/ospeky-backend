// File: backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Buat Universitas
  const univBrawijaya = await prisma.universitas.create({
    data: { nama: 'Universitas Brawijaya' },
  });
  const univNegeriMalang = await prisma.universitas.create({
    data: { nama: 'Universitas Negeri Malang' },
  });

  // Buat Fakultas untuk Universitas Brawijaya
  await prisma.fakultas.createMany({
    data: [
      { nama: 'Fakultas Ilmu Komputer (FILKOM)', universitasId: univBrawijaya.id },
      { nama: 'Fakultas Ekonomi dan Bisnis (FEB)', universitasId: univBrawijaya.id },
      { nama: 'Fakultas Teknik (FT)', universitasId: univBrawijaya.id },
    ],
  });

  // Buat Fakultas untuk Universitas Negeri Malang
  await prisma.fakultas.createMany({
    data: [
      { nama: 'Fakultas Teknik (FT)', universitasId: univNegeriMalang.id },
      { nama: 'Fakultas Sastra (FS)', universitasId: univNegeriMalang.id },
      { nama: 'Fakultas Ilmu Pendidikan (FIP)', universitasId: univNegeriMalang.id },
    ],
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });