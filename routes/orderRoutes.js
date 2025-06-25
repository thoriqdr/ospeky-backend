const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

const prisma = new PrismaClient();
const router = express.Router();

// RUTE BARU UNTUK MENGAMBIL DATA KPI DASHBOARD
// Ganti rute /dashboard-kpi yang lama dengan versi baru ini

router.get('/dashboard-kpi', protect, adminOnly, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Data yang tidak terikat waktu
    const totalUser = await prisma.user.count();
    const totalOrder = await prisma.pesanan.count();

    // Data pendapatan 30 hari terakhir (sudah benar)
    const totalPendapatanResult = await prisma.pesanan.aggregate({
      _sum: { total: true },
      where: {
        status: 'SELESAI',
        updatedAt: { gte: thirtyDaysAgo },
      },
    });
    const totalPendapatan30Hari = totalPendapatanResult._sum.total || 0;

    // Data status saat ini (snapshot)
    const lunasCount = await prisma.pesanan.count({ where: { status: 'LUNAS' } });
    const menungguPelunasanCount = await prisma.pesanan.count({ where: { status: 'MENUNGGU_PELUNASAN' } });
    const nunggakCount = await prisma.pesanan.count({ where: { status: 'MENUNGGAK' } });
    
    // --- PENAMBAHAN DATA BARU DI SINI ---
    const selesaiCount = await prisma.pesanan.count({ where: { status: 'SELESAI' } });
    const dibatalkanCount = await prisma.pesanan.count({ where: { status: 'DIBATALKAN' } });
    // --- AKHIR PENAMBAHAN ---

    // Kirim semua data sebagai respons
    res.json({
      totalUser,
      totalOrder,
      totalPendapatan: totalPendapatan30Hari, // Nama diubah agar lebih jelas
      lunasCount,
      menungguPelunasanCount,
      nunggakCount,
      selesaiCount,      // Data baru
      dibatalkanCount,   // Data baru
    });
  } catch (error) {
    console.error("Gagal mengambil data KPI:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// RUTE BARU UNTUK AKSI PERUBAHAN STATUS MASSAL
router.patch('/bulk-update-status', protect, adminOnly, async (req, res) => {
  const { ids, newStatus } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0 || !newStatus) {
    return res.status(400).json({ message: 'Data tidak valid.' });
  }

  try {
    // Saat status diubah, 'updatedAt' akan otomatis diperbarui oleh Prisma,
    // yang akan kita gunakan sebagai timestamp 'Barang Diterima' jika statusnya 'SELESAI'.
    const result = await prisma.pesanan.updateMany({
      where: { id: { in: ids } },
      data: { status: newStatus },
    });

    res.status(200).json({ message: `Berhasil memperbarui ${result.count} pesanan.` });
  } catch (error) {
    console.error("Gagal update status massal:", error);
    res.status(500).json({ message: "Gagal memperbarui status pesanan." });
  }
});

// RUTE MEMBUAT PESANAN BARU (VERSI OPTIMAL)
// Ganti seluruh isi rute router.post('/', ...) Anda dengan kode lengkap di bawah ini
router.post('/', protect, async (req, res) => {
  const { alamatPengirimanId, detailPesanan, opsiPengiriman, catatan } = req.body;
  const userId = req.user.id;

  if (!detailPesanan || detailPesanan.length === 0) {
    return res.status(400).json({ message: 'Keranjang belanja tidak boleh kosong.' });
  }
  if (opsiPengiriman === 'diantar' && !alamatPengirimanId) {
    return res.status(400).json({ message: 'Alamat pengiriman wajib diisi untuk opsi "Diantar".' });
  }

  try {
    const produkIds = detailPesanan.map(item => item.produkId);
    const produkDiDb = await prisma.produk.findMany({
      where: { id: { in: produkIds } },
      include: { variants: true }
    });
    const produkMap = new Map(produkDiDb.map(p => [p.id, p]));

    // Logika kalkulasi total pembayaran awal (tidak berubah)
    let totalHargaCheckout = 0;
    for (const item of detailPesanan) {
      const produk = produkMap.get(item.produkId);
      if (!produk) throw new Error(`Produk dengan ID ${item.produkId} tidak ditemukan.`);
      
      const varian = produk.variants.find(v => v.id === item.variantId);
      if (!varian) throw new Error(`Varian untuk produk ${produk.namaProduk} tidak ditemukan.`);

      switch (produk.tipeProduk) {
        case 'TUNGGAL': case 'VARIAN':
          totalHargaCheckout += varian.harga * item.jumlah;
          if (varian.stok < item.jumlah) throw new Error(`Stok untuk ${produk.namaProduk} (${varian.namaVarian}) tidak mencukupi.`);
          break;
        case 'PO_LANGSUNG': case 'PO_DP':
          if (produk.hargaPO === null) throw new Error(`Produk PO ${produk.namaProduk} tidak memiliki harga DP.`);
          totalHargaCheckout += produk.hargaPO * item.jumlah;
          break;
        default:
          throw new Error(`Tipe produk tidak dikenal: ${produk.tipeProduk}`);
      }
    }

    const pesananBaru = await prisma.$transaction(async (tx) => {
      const pesanan = await tx.pesanan.create({
        data: {
          userId,
          alamatPengirimanId: opsiPengiriman === 'diantar' ? alamatPengirimanId : null,
          total: totalHargaCheckout,
          opsiPengiriman: opsiPengiriman,
          catatan: catatan,
          detailPesanan: {
            create: detailPesanan.map(item => {
              const produk = produkMap.get(item.produkId);
              const varian = produk.variants.find(v => v.id === item.variantId);
              const gambarUtama = produk.gambarUrls ? JSON.parse(produk.gambarUrls)[0] : null;
              
              let hargaPerItem = (produk.tipeProduk === 'PO_DP' || produk.tipeProduk === 'PO_LANGSUNG') ? produk.hargaPO : varian.harga;

              // Mengisi data snapshot saat pesanan dibuat
              return {
                produkId: item.produkId,
                variantId: item.variantId,
                jumlah: item.jumlah,
                harga: hargaPerItem,
                namaProdukSnapshot: `${produk.namaProduk}${varian.namaVarian !== 'Default' ? ` (${varian.namaVarian})` : ''}`,
                gambarProdukSnapshot: varian.gambarUrl || gambarUtama,
                tipeProdukSnapshot: produk.tipeProduk,
                hargaTotalPOSnapshot: produk.hargaTotalPO
              };
            }),
          },
        },
      });

      // Logika update stok dan total terjual (sudah optimal)
      const updatePromises = [];
      for (const item of detailPesanan) {
        updatePromises.push(
          tx.produk.update({
            where: { id: item.produkId },
            data: { totalTerjual: { increment: item.jumlah } },
          })
        );
        
        const produk = produkMap.get(item.produkId);
        if (item.variantId && produk.tipeProduk !== 'PO_DP' && produk.tipeProduk !== 'PO_LANGSUNG') {
          updatePromises.push(
            tx.varian.update({
              where: { id: item.variantId },
              data: { terjual: { increment: item.jumlah }, stok: { decrement: item.jumlah } },
            })
          );
        }
      }

      await Promise.all(updatePromises);
      return pesanan;
      
    }, {
      maxWait: 15000,
      timeout: 15000,
    });

    res.status(201).json({ message: 'Pesanan berhasil dibuat!', pesanan: pesananBaru });
  } catch (error) {
    console.error("Gagal membuat pesanan:", error.message);
    res.status(400).json({ message: error.message || 'Terjadi kesalahan pada server saat membuat pesanan.' });
  }
});



// RUTE 2: GENERATE NOMOR URUT
router.patch('/generate-sequence', protect, adminOnly, async (req, res) => {
  const { orderIds, prefix } = req.body;
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0 || !prefix) {
    return res.status(400).json({ message: "Data tidak valid." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cek dulu apakah ada pesanan yang dipilih yang sudah punya ID.
      const selectedOrders = await tx.pesanan.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, nomorUrutAngka: true }
      });

      const alreadyHasId = selectedOrders.some(order => order.nomorUrutAngka !== null);
      if (alreadyHasId) {
        // 'throw' error di dalam transaksi akan membatalkan semuanya dengan aman.
        throw new Error("Gagal: Beberapa pesanan yang dipilih sudah memiliki Nomor Urut.");
      }

      // 2. LOGIKA BARU: Temukan angka terbesar dari DUA sumber.
      // Ambil angka terakhir dari tabel counter
      const counter = await tx.nomorUrutCounter.findUnique({
        where: { prefix },
      });
      const lastCounterNumber = counter?.lastNumber || 0;

      // Ambil angka terbesar yang pernah dipakai di tabel pesanan untuk prefix ini
      const maxOrderResult = await tx.pesanan.aggregate({
        _max: { nomorUrutAngka: true },
        where: { nomorUrutPrefix: prefix },
      });
      const maxOrderNumber = maxOrderResult._max.nomorUrutAngka || 0;
      
      // 3. Gunakan angka terbesar dari keduanya sebagai titik awal. Ini mencegah duplikasi.
      let currentNumber = Math.max(lastCounterNumber, maxOrderNumber);

      // 4. Proses pesanan satu per satu dengan angka yang sudah aman
      const updatedOrders = [];
      for (const orderId of orderIds) {
        currentNumber++; // Increment nomor untuk pesanan ini
        
        const order = await tx.pesanan.update({
          where: { id: orderId },
          data: { 
            nomorUrutPrefix: prefix, 
            nomorUrutAngka: currentNumber 
          },
        });
        updatedOrders.push(order);
      }

      // 5. Setelah semua selesai, update tabel counter dengan angka terakhir yang dipakai.
      await tx.nomorUrutCounter.upsert({
        where: { prefix },
        update: { lastNumber: currentNumber },
        create: { prefix, lastNumber: currentNumber },
      });

      return updatedOrders;
    }, { timeout: 30000 });

    res.status(200).json({ message: `Berhasil generate ID untuk ${result.length} pesanan.`, orders: result });
  } catch (error) {
    console.error("Gagal generate sequence:", error);
    // Kirim pesan error yang lebih spesifik jika itu dari validasi kita
    res.status(500).json({ message: error.message || "Terjadi kesalahan pada server saat generate ID." });
  }
});


// RUTE 3: MENGAMBIL SEMUA PREFIX YANG SUDAH ADA
router.get('/prefixes', protect, adminOnly, async (req, res) => {
  try {
    const counters = await prisma.nomorUrutCounter.findMany({ orderBy: { prefix: 'asc' } });
    const prefixes = counters.map(c => c.prefix);
    res.json(prefixes);
  } catch (error) {
    console.error("Gagal mengambil prefix:", error);
    res.status(500).json({ message: 'Gagal mengambil data prefix.' });
  }
});


// RUTE 4: MERESET COUNTER SEBUAH PREFIX
router.post('/reset-sequence', protect, adminOnly, async (req, res) => {
  const { prefix } = req.body;
  if (!prefix) {
    return res.status(400).json({ message: 'Prefix dibutuhkan.' });
  }
  try {
    await prisma.nomorUrutCounter.update({
      where: { prefix: prefix },
      data: { lastNumber: 0 },
    });
    res.status(200).json({ message: `Nomor urut untuk prefix '${prefix}' berhasil direset.` });
  } catch (error) {
    console.error(`Gagal mereset prefix '${prefix}':`, error);
    res.status(500).json({ message: `Gagal mereset prefix '${prefix}'. Mungkin prefix tidak ditemukan.` });
  }
});


// RUTE 5: GET PESANAN UNTUK ADMIN PANEL (VERSI SUPER PINTAR)
router.get('/', protect, adminOnly, async (req, res) => {
  let { status, searchTerm, sortOrder, source } = req.query;
  
  try {
    let where = {};
    
    // 1. FILTER STATUS WAJIB UNTUK HALAMAN PACKING
    // Jika permintaan datang dari halaman packing, paksa statusnya.
    if (source === 'packing') {
        const packingStatuses = ['LUNAS', 'MENUNGGU_PELUNASAN'];
        // Jika frontend juga mengirim filter status (LUNAS atau MENUNGGU_PELUNASAN), gunakan itu.
        // Jika tidak (misal 'ALL'), gunakan daftar default packing.
        if (status && packingStatuses.includes(status)) {
            where.status = status;
        } else {
            where.status = { in: packingStatuses };
        }
    } else if (status) {
        // Untuk halaman lain (seperti Dashboard), gunakan filter status seperti biasa
        const statusArray = Array.isArray(status) ? status : [status];
        if (statusArray.length > 0) {
            where.status = { in: statusArray };
        }
    }

    // 2. LOGIKA PENCARIAN CANGGIH
    if (searchTerm) {
      // Jika diawali #, kita asumsikan ini adalah ID Pesanan
      if (searchTerm.startsWith('#')) {
          const orderId = searchTerm.substring(1);
          where.id = { contains: orderId };
      } else {
          // Logika untuk No. Resi (misal: A001, B123)
          const resiMatch = searchTerm.match(/^([A-Z]+)(\d+)$/i);
          
          let orConditions = [
              { user: { nama: { contains: searchTerm } } }, // Cari berdasarkan Nama Customer
              { detailPesanan: { some: { produk: { namaProduk: { contains: searchTerm } } } } }, // Cari berdasarkan Nama Produk
          ];

          if (resiMatch) {
              const prefix = resiMatch[1].toUpperCase();
              const number = parseInt(resiMatch[2], 10);
              orConditions.push({
                  nomorUrutPrefix: prefix,
                  nomorUrutAngka: number,
              });
          }
          where.OR = orConditions;
      }
    }

    const orderBy = { createdAt: sortOrder === 'oldest' ? 'asc' : 'desc' };

    const orders = await prisma.pesanan.findMany({
      where,
      orderBy,
      include: {
        user: { select: { nama: true, email: true, nomorHp: true } }, 
        alamatPengiriman: true,
        detailPesanan: {
          include: {
            produk: true,
            variant: true,
          },
        },
      },
    });
    res.json(orders);
  } catch (error) {
    console.error("Server error fetching admin orders:", error);
    res.status(500).json({ message: "Gagal mengambil data pesanan" });
  }
});



// RUTE 6: UPDATE STATUS PACKING
router.patch('/update-packing-status', protect, adminOnly, async (req, res) => {
  const { orderIds, statusPacking } = req.body;
  if (!orderIds || !statusPacking || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ message: "Parameter tidak valid" });
  }
  try {
    const result = await prisma.pesanan.updateMany({ where: { id: { in: orderIds } }, data: { statusPacking: statusPacking } });
    res.status(200).json({ message: `Berhasil memperbarui ${result.count} pesanan.`, count: result.count });
  } catch (error) {
    console.error("Error updating packing status:", error);
    res.status(500).json({ message: "Gagal memperbarui status packing" });
  }
});


// RUTE 7: GET PESANAN UNTUK HALAMAN 'PESANAN SAYA' PELANGGAN (SUDAH DIPERBAIKI)
router.get('/myorders', protect, async (req, res) => {
  try {
    const userOrders = await prisma.pesanan.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        alamatPengiriman: true,
        detailPesanan: {
          include: {
            produk: true,
            variant: true
          }
        }
      }
    });
    res.json(userOrders);
  } catch (error) {
    console.error("Server error fetching user orders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/unpaid-count', protect, async (req, res) => {
  try {
    const count = await prisma.pesanan.count({
      where: {
        userId: req.user.id,
        status: {
          in: ['MENUNGGAK', 'MENUNGGU_PELUNASAN'],
        },
      },
    });
    res.status(200).json({ count });
  } catch (error) {
    console.error("Gagal mengambil jumlah pesanan:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// RUTE 8: GET DETAIL PESANAN SPESIFIK UNTUK PELANGGAN
router.get('/myorders/:id', protect, async (req, res) => {
  try {
    const order = await prisma.pesanan.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: {
        alamatPengiriman: true,
        user: { select: { nama: true } },
        detailPesanan: {
          include: {
            produk: true,
            variant: true,
          },
        },
      },
    });
    if (!order) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("Gagal mengambil detail pesanan:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// Tambahkan ini di dalam file: backend/routes/orderRoutes.js

// Ganti kedua rute scanner yang lama dengan versi baru ini

// Rute untuk VERIFIKASI (Read-Only)
router.get('/verify-pickup/:id', protect, adminOnly, async (req, res) => {
  try {
    const order = await prisma.pesanan.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { nama: true } },
        detailPesanan: {
          include: {
            produk: { select: { namaProduk: true } },
            variant: { select: { namaVarian: true } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    }

    // Jika statusnya SUDAH SELESAI, kirim pesan error beserta waktu updatedAt
    if (order.status === 'SELESAI') {
      return res.status(400).json({ 
        message: `Pesanan ini sudah pernah diambil.`,
        completedAt: order.updatedAt // <-- KITA GUNAKAN updatedAt DI SINI
      });
    }

    if (order.status !== 'LUNAS') {
      return res.status(400).json({ message: `Pesanan ini belum lunas (Status: ${order.status}).` });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error saat verifikasi pesanan.' });
  }
});


// Rute untuk KONFIRMASI (Update/Write)
router.patch('/complete-pickup/:id', protect, adminOnly, async (req, res) => {
  try {
    const existingOrder = await prisma.pesanan.findFirst({
        where: { id: req.params.id, status: 'LUNAS' }
    });
    
    if (!existingOrder) {
        return res.status(404).json({ message: 'Pesanan tidak ditemukan atau statusnya bukan LUNAS.' });
    }

    const updatedOrder = await prisma.pesanan.update({
      where: { id: req.params.id },
      data: { 
        status: 'SELESAI',
        // 'updatedAt' akan diperbarui secara otomatis oleh Prisma saat ada perubahan data
      },
    });

    res.status(200).json({ message: 'Pesanan berhasil diselesaikan!', order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Server error saat menyelesaikan pesanan.' });
  }
});

module.exports = router;