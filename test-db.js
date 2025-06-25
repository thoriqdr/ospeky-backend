// backend/test-db.js (versi debug)

const { PrismaClient } = require('@prisma/client');

console.log('Skrip dimulai. Membuat instance PrismaClient...');
const prisma = new PrismaClient({
  // Menambahkan log untuk query database
  log: ['query', 'info', 'warn', 'error'],
});
console.log('Instance PrismaClient berhasil dibuat.');

async function main() {
  try {
    console.log('Fungsi main() dijalankan. Mencoba menghubungkan...');
    await prisma.$connect();
    console.log('✅ KONEKSI EKSPLISIT BERHASIL!');

    console.log('Mencoba mengambil data user pertama...');
    const user = await prisma.user.findFirst();
    console.log('Query findFirst() selesai dijalankan.');
    
    if (user) {
      console.log('Ditemukan user:', user);
    } else {
      console.log('Tidak ada data user di dalam database.');
    }
  } catch (error) {
    console.error('❌ TERJADI ERROR:', error);
  } finally {
    console.log('Menjalankan disconnect...');
    await prisma.$disconnect();
    console.log('Koneksi ditutup. Skrip selesai.');
  }
}

main();