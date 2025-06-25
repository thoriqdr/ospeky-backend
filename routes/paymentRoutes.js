const express = require('express');
const midtransClient = require('midtrans-client');
const { protect } = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// ROUTE UNTUK MEMBUAT/MENGAMBIL TOKEN TRANSAKSI (LENGKAP)
// Ganti HANYA rute /request-midtrans Anda dengan versi debugging ini
router.post('/request-midtrans', protect, async (req, res) => {
  try {
    const { orderId, type } = req.body;
    const userId = req.user.id;

    const order = await prisma.pesanan.findFirst({
      where: { id: orderId, userId: userId },
      include: {
        user: true,
        detailPesanan: { include: { produk: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    }
    
    // Logika untuk menggunakan kembali token tidak berubah
    const existingTransaction = await prisma.transaksiPembayaran.findFirst({
      where: { pesananId: orderId, tipe: type, status: 'pending' }
    });
    if (existingTransaction && existingTransaction.tokenMidtrans) {
      try {
        const status = await snap.transaction.status(existingTransaction.tokenMidtrans);
        if (status.transaction_status !== 'expire') {
          return res.status(200).json({ token: existingTransaction.tokenMidtrans });
        }
      } catch (error) {}
    }

    let amount;
    let midtransOrderId;

    if (type === 'DP' && order.status === 'MENUNGGAK') {
      amount = order.total;
      midtransOrderId = `${order.id}-DP-${Date.now()}`;
    } 
    else if (type === 'PELUNASAN' && order.status === 'MENUNGGU_PELUNASAN') {
      
      console.log("\n\n--- 🕵️‍♂️ MEMULAI PROSES KALKULASI PELUNASAN 🕵️‍♂️ ---");

      // LOG 1: Tampilkan semua item dalam pesanan untuk diperiksa
      console.log("1. SEMUA ITEM DALAM PESANAN:");
      order.detailPesanan.forEach(d => {
        console.log(`  - ${d.produk.namaProduk}, Tipe: ${d.produk.tipeProduk}, Harga Total PO: ${d.produk.hargaTotalPO}`);
      });
      
      const poItems = order.detailPesanan.filter(d => 
        d.produk.tipeProduk === 'PO_DP' || d.produk.tipeProduk === 'PO_LANGSUNG'
      );

      // LOG 2: Tampilkan item mana saja yang berhasil difilter sebagai item PO
      console.log("\n2. ITEM YANG DIFILTER SEBAGAI PO ('poItems'):");
      poItems.forEach(d => {
        console.log(`  - Ditemukan: ${d.produk.namaProduk} (Tipe: ${d.produk.tipeProduk})`);
      });
      
      if(poItems.length === 0) {
        return res.status(400).json({ message: "Pesanan ini tidak memiliki item PO yang perlu dilunasi." });
      }

      const allPricesSet = poItems.every(d => d.produk.hargaTotalPO != null && d.produk.hargaTotalPO > 0);
      
      // LOG 3: Tampilkan hasil pengecekan apakah semua harga sudah di-set
      console.log(`\n3. APAKAH SEMUA HARGA PO SUDAH DISET? -> ${allPricesSet}`);
      
      if (!allPricesSet) {
        return res.status(400).json({ message: "Harga total untuk satu atau lebih produk PO belum ditetapkan oleh admin." });
      }

      console.log("\n4. RINCIAN KALKULASI:");
      let totalFullPoPrice = 0;
      let totalDpPaidForPoItems = 0;

      poItems.forEach(item => {
        const fullPrice = item.produk.hargaTotalPO * item.jumlah;
        const dpPrice = item.harga * item.jumlah;
        console.log(`  - Untuk [${item.produk.namaProduk}]:`);
        console.log(`    > Harga Penuh: ${fullPrice}`);
        console.log(`    > DP Dibayar: ${dpPrice}`);
        totalFullPoPrice += fullPrice;
        totalDpPaidForPoItems += dpPrice;
      });

      // LOG 5: Tampilkan hasil kalkulasi akhir
      console.log(`\n5. HASIL KALKULASI:`);
      console.log(`  - Total Harga Penuh PO: ${totalFullPoPrice}`);
      console.log(`  - Total DP Dibayar untuk item PO: ${totalDpPaidForPoItems}`);
      
      amount = totalFullPoPrice - totalDpPaidForPoItems;
      console.log(`  - JUMLAH FINAL (Amount): ${amount}`);

      if (amount <= 0) {
        return res.status(400).json({ message: "Tidak ada sisa pelunasan yang harus dibayar." });
      }
      
      midtransOrderId = `${order.id}-PELUNASAN-${Date.now()}`;
      console.log("\n--- ✅ SELESAI KALKULASI, SIAP KIRIM KE MIDTRANS ✅ ---\n");
    } 
    else {
      return res.status(400).json({ message: `Status pesanan (${order.status}) tidak valid untuk pembayaran tipe '${type}'.` });
    }

    const parameter = {
      "transaction_details": { "order_id": midtransOrderId, "gross_amount": amount },
      "customer_details": { "first_name": order.user.nama, "email": order.user.email },
    };

    const transaction = await snap.createTransaction(parameter);
    const transactionToken = transaction.token;

    await prisma.transaksiPembayaran.create({
      data: {
        id: midtransOrderId,
        pesananId: order.id,
        tokenMidtrans: transactionToken,
        tipe: type,
        status: 'pending',
        jumlah: amount
      }
    });

    res.status(200).json({ token: transactionToken });

  } catch (error) {
    console.error("MIDTRANS ERROR:", error.message);
    res.status(500).json({ message: `Gagal membuat transaksi Midtrans: ${error.message}` });
  }
});


// ROUTE NOTIFIKASI DARI MIDTRANS (DENGAN LOGGING LENGKAP)
// Ganti seluruh rute /notification-handler Anda dengan versi final yang bersih ini
router.post('/notification-handler', async (req, res) => {
  try {
    const notificationJson = req.body;
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = notificationJson;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const stringToHash = order_id + status_code + gross_amount + serverKey;
    const hashedString = crypto.createHash('sha512').update(stringToHash).digest('hex');

    if (hashedString !== signature_key) {
      return res.status(403).json({ message: 'Invalid signature' });
    }

    const paymentTransaction = await prisma.transaksiPembayaran.findUnique({
      where: { id: order_id },
      include: {
        pesanan: {
          include: {
            detailPesanan: {
              include: {
                produk: true
              }
            }
          }
        }
      }
    });

    if (!paymentTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction_status == 'settlement' || transaction_status == 'capture') {
      
      let dataToUpdate = {};

      // Logika hanya untuk tipe transaksi 'DP'
      if (paymentTransaction.tipe === 'DP') {
        const containsTwoStepPo = paymentTransaction.pesanan.detailPesanan.some(
          detail => detail.produk.tipeProduk === 'PO_DP' || detail.produk.tipeProduk === 'PO_LANGSUNG'
        );

        if (containsTwoStepPo) {
          dataToUpdate = {
            status: 'MENUNGGU_PELUNASAN',
            jumlahDp: paymentTransaction.jumlah,
            tanggalDp: new Date()
          };
        } else {
          dataToUpdate = {
            status: 'LUNAS',
            jumlahDp: paymentTransaction.jumlah,
            tanggalDp: new Date()
          };
        }
      } 
      // Logika untuk tipe transaksi 'PELUNASAN'
      else if (paymentTransaction.tipe === 'PELUNASAN') {
        dataToUpdate = {
          status: 'LUNAS',
          jumlahPelunasan: paymentTransaction.jumlah,
          tanggalPelunasan: new Date()
        };
      }

      // Lakukan update jika ada data yang perlu diubah
      if (Object.keys(dataToUpdate).length > 0) {
        await prisma.pesanan.update({
          where: { id: paymentTransaction.pesananId },
          data: dataToUpdate,
        });
      }

      await prisma.transaksiPembayaran.update({
        where: { id: order_id },
        data: { status: 'settlement' }
      });
      
    } else if (transaction_status == 'expire') {
      await prisma.transaksiPembayaran.update({
        where: { id: order_id },
        data: { status: 'expire' }
      });
      if (paymentTransaction.tipe === 'DP' && paymentTransaction.pesanan.status === 'MENUNGGAK') {
        await prisma.pesanan.update({
          where: { id: paymentTransaction.pesananId },
          data: { status: 'DIBATALKAN' }
        });
      }
    }

    res.status(200).json({ message: 'Notification processed successfully.' });

  } catch (error) {
    console.error('Gagal memproses notifikasi:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;