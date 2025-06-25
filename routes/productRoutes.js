const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  }
});

const upload = multer({ storage: storage });

// GET all products
// --- MODIFIKASI DIMULAI DI SINI ---
// GET all products - Dibuat "Pintar" dengan filter dan sort
router.get('/', protect, adminOnly, async (req, res) => {
  const { searchTerm, sortOrder } = req.query;
  try {
    let where = {};
    if (searchTerm) {
        where.OR = [
            { namaProduk: { contains: searchTerm } },
            { idProduk: { contains: searchTerm } }
        ];
    }
    const orderBy = {
        createdAt: sortOrder === 'oldest' ? 'asc' : 'desc',
    };
    const products = await prisma.produk.findMany({
      where,
      orderBy,
      include: { 
        variants: true,
        universitas: true,
        fakultas: true,
      },
    });
    res.status(200).json(products);
  } catch (error) {
    console.error("Gagal mengambil data produk:", error);
    res.status(500).json({ message: "Gagal mengambil data produk" });
  }
});
// --- MODIFIKASI SELESAI ---

// Di dalam file: backend/routes/productRoutes.js

// Ganti blok router.get('/public', ...) Anda dengan yang ini
router.get('/public', async (req, res) => {
  try {
    // Ambil parameter filter dari query URL
    const { universityId, type } = req.query;

    // Siapkan kondisi dasar untuk query: hanya produk 'Aktif'
    const whereClause = {
      status: 'Aktif'
    };

    // Tambahkan filter berdasarkan parameter yang ada
    if (universityId) {
      whereClause.universitasId = universityId;
    }

    if (type === 'universitas') {
      // Jika tipe 'universitas', cari yang fakultasId-nya kosong (null)
      whereClause.fakultasId = null;
    } else if (type === 'fakultas') {
      // Jika tipe 'fakultas', cari yang fakultasId-nya TIDAK kosong
      whereClause.fakultasId = { not: null };
    }

    // Lakukan query ke database dengan semua kondisi
    let products = await prisma.produk.findMany({
      where: whereClause,
      orderBy: { 
        createdAt: 'desc' 
      },
      include: { 
        variants: true,
        universitas: { select: { nama: true } },
        fakultas: { select: { nama: true } }
      },
    });

    // Bagian ini sudah bagus untuk memastikan gambarUrls selalu array
    products = products.map(product => {
      if (product.gambarUrls && typeof product.gambarUrls === 'string') {
        try { product.gambarUrls = JSON.parse(product.gambarUrls); } catch (e) { product.gambarUrls = []; }
      } else if (!product.gambarUrls) { product.gambarUrls = []; }
      return product;
    });

    res.status(200).json(products);
  } catch (error) {
    console.error("Gagal mengambil data produk publik:", error);
    res.status(500).json({ message: "Gagal mengambil data produk" });
  }
});


router.patch('/bulk-status', protect, adminOnly, async (req, res) => {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || !status) {
        return res.status(400).json({ message: "Data tidak valid." });
    }
    try {
        await prisma.produk.updateMany({
            where: { id: { in: ids } },
            data: { status }
        });
        res.status(200).json({ message: 'Status produk berhasil diperbarui' });
    } catch (error) {
        console.error("Gagal update status produk massal:", error);
        res.status(500).json({ message: 'Gagal memperbarui status produk' });
    }
});
  
// Ganti blok router.delete('/bulk-delete', ...) Anda dengan yang ini

// Ganti seluruh blok router.delete('/bulk-delete', ...) Anda dengan yang ini
router.delete('/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "ID produk tidak valid." });
    }

    try {
        // Pemeriksaan kritis tetap sama
        const problematicOrder = await prisma.pesanan.findFirst({
            where: {
                status: 'MENUNGGU_PELUNASAN',
                detailPesanan: {
                    some: {
                        produkId: { in: ids },
                        tipeProdukSnapshot: 'PO_DP',
                        hargaTotalPOSnapshot: null
                    }
                }
            }
        });

        if (problematicOrder) {
            return res.status(409).json({
                message: "Gagal Hapus: Satu atau lebih produk terikat pada pesanan Pre-Order yang harganya belum ditetapkan. Harap selesaikan atau batalkan pesanan tersebut terlebih dahulu."
            });
        }

        // Jika aman, kita hanya perlu menghapus produknya.
        // Varian akan terhapus otomatis karena relasi 'onDelete: Cascade'.
        // DetailPesanan akan di-update menjadi null karena 'onDelete: SetNull'.
        const deleteResult = await prisma.produk.deleteMany({
            where: { id: { in: ids } },
        });

        res.status(200).json({ message: `${deleteResult.count} produk berhasil dihapus secara permanen.` });

    } catch (error) {
        console.error("--- ERROR SAAT BULK DELETE ---", error);
        res.status(500).json({ message: "Terjadi kesalahan yang tidak terduga pada server." });
    }
});
// --- AKHIR DARI BAGIAN BARU ---

// GET single product by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const product = await prisma.produk.findUnique({
        where: { id: id },
        include: { 
            variants: true, 
            universitas: true,
            fakultas: true 
        },
      });

      if (!product) {
        return res.status(404).json({ message: "Produk tidak ditemukan." });
      }
      
      res.status(200).json(product);
    } catch (error) {
      console.error(`Gagal mengambil produk dengan ID ${id}:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
});

// Ganti seluruh blok router.post Anda dengan yang ini

// Ganti seluruh blok router.post Anda dengan yang ini

router.post(
  '/',
  upload.any(), // Middleware upload.any() sudah benar
  async (req, res) => {
    try {
      const {
        namaProduk, deskripsi, status, pricingType, isPO,
        hargaPO, stokPO, hargaTotalPO,
        singlePrice, singleStock,
        universitasId, fakultasId, variants,
        tipeProduk
      } = req.body;

      if (!universitasId) {
        return res.status(400).json({ message: "Universitas wajib dipilih." });
      }

      // --- PERBAIKAN LOGIKA PEMBACAAN FILE DI SINI ---
      // Karena menggunakan .any(), req.files adalah sebuah array. Kita perlu memfilternya.
      const mainImageFiles = req.files.filter(f => f.fieldname === 'productImages');
      const variantImageFiles = req.files.filter(f => f.fieldname.startsWith('variantImage_'));
      
      const imageUrls = mainImageFiles.map(file => file.path.replace(/\\/g, "/"));
      
      let variantsToCreate = [];
      // Cek jika mode HARGA VARIASI dan data variants ada
      if (isPO !== 'true' && pricingType === 'variant' && variants) {
          const variantsFromRequest = JSON.parse(variants);
          
          variantsToCreate = variantsFromRequest.map((variant, index) => {
              // Mencocokkan file dengan varian berdasarkan urutan
              const imageFile = variantImageFiles[index];
              return {
                  namaVarian: variant.name,
                  harga: Number(variant.price) || 0,
                  stok: Number(variant.stock) || 0,
                  gambarUrl: imageFile ? imageFile.path.replace(/\\/g, "/") : null,
              };
          });
      } else {
        // Jika mode HARGA TUNGGAL atau PO, buat satu varian 'Default'
        variantsToCreate.push({
            namaVarian: 'Default',
            harga: Number(isPO === 'true' ? hargaPO : singlePrice) || 0,
            stok: Number(isPO === 'true' ? stokPO : singleStock) || 0,
        });
      }

      // Buat produk dan semua variannya dalam satu perintah atomik (Nested Write)
      const newProduct = await prisma.produk.create({
        data: {
          namaProduk, deskripsi, status,
          gambarUrls: JSON.stringify(imageUrls),
          isPO: isPO === 'true',
          tipeProduk: tipeProduk,
          hargaPO: isPO === 'true' ? Number(hargaPO) : null,
          stokPO: isPO === 'true' ? Number(stokPO) : null,
          hargaTotalPO: isPO === 'true' && hargaTotalPO ? Number(hargaTotalPO) : null,
          idProduk: `#${String(Date.now()).slice(-6)}`,
          universitasId,
          fakultasId: fakultasId || null,
          variants: {
            create: variantsToCreate
          }
        },
        include: { 
          variants: true 
        }
      });
      
      res.status(201).json(newProduct);

    } catch (error) {
      console.error("Error saat menyimpan produk baru:", error);
      res.status(500).json({ message: 'Gagal menyimpan produk ke database.', error: error.message });
    }
  }
);

// PATCH (Update) a product by ID - FINAL ROBUST VERSION
// Ganti seluruh blok router.patch('/:id', ...) Anda dengan versi ini
router.patch('/:id', upload.any(), async (req, res) => {
    const { id } = req.params;
    try {
        const {
            namaProduk, deskripsi, status, pricingType, isPO,
            hargaPO, stokPO, hargaTotalPO, singlePrice, singleStock,
            universitasId, fakultasId, variants, existingImageUrls,
            tipeProduk
        } = req.body;

        const finalProduct = await prisma.$transaction(async (tx) => {
            // Ambil data produk sebelum diupdate untuk perbandingan
            const produkSebelumUpdate = await tx.produk.findUnique({ where: { id } });

            const updateDataProduk = {
                namaProduk, deskripsi, status, isPO: isPO === 'true',
                tipeProduk: tipeProduk,
                hargaPO: isPO === 'true' ? Number(hargaPO) || null : null,
                stokPO: isPO === 'true' ? Number(stokPO) || null : null,
                hargaTotalPO: isPO === 'true' && hargaTotalPO ? Number(hargaTotalPO) : null,
                universitasId: universitasId,
                fakultasId: fakultasId || null,
            };

            let finalMainImageUrls = existingImageUrls ? JSON.parse(existingImageUrls) : [];
            const newMainImageFiles = req.files.filter(f => f.fieldname === 'productImages');
            const newImageUrls = newMainImageFiles.map(file => file.path.replace(/\\/g, "/"));
            updateDataProduk.gambarUrls = JSON.stringify([...finalMainImageUrls, ...newImageUrls]);

            await tx.produk.update({ where: { id }, data: updateDataProduk });

            // --- LOGIKA BARU: Update Snapshot di Pesanan Terkait ---
            // Cek apakah hargaTotalPO diubah dan memiliki nilai baru.
            const newHargaTotalPO = updateDataProduk.hargaTotalPO;
            if (newHargaTotalPO && newHargaTotalPO !== produkSebelumUpdate.hargaTotalPO) {
                // Jika ya, cari semua DetailPesanan yang relevan dan perbarui snapshot-nya.
                await tx.detailPesanan.updateMany({
                    where: {
                        produkId: id,
                        pesanan: {
                            status: 'MENUNGGU_PELUNASAN'
                        }
                    },
                    data: {
                        hargaTotalPOSnapshot: newHargaTotalPO
                    }
                });
            }
            // --- AKHIR DARI LOGIKA BARU ---

            // Logika untuk varian tidak berubah
            await tx.varian.deleteMany({ where: { produkId: id } });
            let variantsToCreate = [];
            if (isPO !== 'true' && pricingType === 'variant' && variants && variants !== '[]') {
                const variantsFromRequest = JSON.parse(variants);
                const variantImageFiles = req.files.filter(f => f.fieldname.startsWith('variantImage_'));
                variantsToCreate = variantsFromRequest.map((variant, index) => {
                    let imageUrl = variant.existingImageUrl || null;
                    const newImageFile = variantImageFiles.find(f => f.fieldname === `variantImage_${index}`);
                    if (newImageFile) { imageUrl = newImageFile.path.replace(/\\/g, "/"); }
                    return { namaVarian: variant.name, harga: Number(variant.price) || 0, stok: Number(variant.stock) || 0, gambarUrl: imageUrl, produkId: id };
                });
            } else {
                variantsToCreate.push({ namaVarian: 'Default', harga: Number(isPO === 'true' ? hargaPO : singlePrice) || 0, stok: Number(isPO === 'true' ? stokPO : singleStock) || 0, produkId: id });
            }
            if (variantsToCreate.length > 0) {
                await tx.varian.createMany({ data: variantsToCreate });
            }
            
            return await tx.produk.findUnique({ where: { id: id }, include: { variants: true } });
        }, 
        { maxWait: 15000, timeout: 15000 });
        
        res.status(200).json(finalProduct);
    } catch (error) {
        console.error(`Gagal mengupdate produk dengan ID ${id}:`, error);
        res.status(500).json({ message: "Gagal mengupdate produk.", error: error.message });
    }
});


module.exports = router;