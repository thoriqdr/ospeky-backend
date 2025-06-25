const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cancelExpiredOrders = async () => {
  console.log('CRON JOB: Running check for expired orders at', new Date().toLocaleTimeString());
  
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const expiredOrders = await prisma.pesanan.findMany({
      where: {
        status: 'MENUNGGAK',
        createdAt: { lt: oneHourAgo },
      },
      include: { detailPesanan: true }
    });

    if (expiredOrders.length === 0) {
      console.log('CRON JOB: No expired orders found.');
      return;
    }

    console.log(`CRON JOB: Found ${expiredOrders.length} expired orders. Processing...`);

    // Memulai transaksi dengan batas waktu yang lebih panjang
    await prisma.$transaction(async (tx) => {
      for (const order of expiredOrders) {
        for (const item of order.detailPesanan) {
          await tx.produk.update({
            where: { id: item.produkId },
            data: { totalTerjual: { decrement: item.jumlah } },
          });

          if (item.variantId) {
            await tx.varian.update({
              where: { id: item.variantId },
              data: { 
                stok: { increment: item.jumlah },
                terjual: { decrement: item.jumlah }
              },
            });
          }
        }

        await tx.pesanan.update({
          where: { id: order.id },
          data: { status: 'DIBATALKAN' },
        });

        console.log(`CRON JOB: Order ${order.id} has been cancelled and stock restored.`);
      }
    }, 
    // --- PERBAIKAN DI SINI ---
    {
      timeout: 30000 // Batas waktu dinaikkan menjadi 30 detik untuk keamanan
    });
    // --- AKHIR PERBAIKAN ---

  } catch (error) {
    console.error('CRON JOB ERROR: Error running cancel expired orders job:', error);
  }
};

const initCronJobs = () => {
  // Jadwal diubah menjadi setiap menit agar mudah dites. Ubah kembali jika perlu.
  cron.schedule('* * * * *', cancelExpiredOrders);
  console.log('Cron job for cancelling expired orders has been scheduled to run every minute.');
};

module.exports = initCronJobs;