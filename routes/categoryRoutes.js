const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// --- Konfigurasi Multer untuk Upload Logo Universitas ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/logos/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// --- GET Endpoints ---

router.get('/universitas/public', async (req, res) => {
  try {
    // Ambil query 'search' dari URL, jika ada
    const { search } = req.query;

    // Siapkan kondisi dasar, harus selalu 'Aktif'
    const whereClause = {
      status: 'Aktif'
    };

    // Jika ada query pencarian, tambahkan kondisi filter nama
    if (search) {
      whereClause.nama = {
        contains: search,
        
      };
    }

    const universities = await prisma.universitas.findMany({
      where: whereClause, // Gunakan kondisi yang sudah kita siapkan
      select: { 
        id: true,
        nama: true,
        logoUrl: true // Menggunakan 'logoUrl' sesuai skema Anda
      },
      orderBy: {
        nama: 'asc'
      }
    });

    res.status(200).json(universities);
  } catch (error) {
    console.error("Gagal mengambil data universitas publik:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});

// --- TAMBAHKAN BLOK BARU INI DI BAWAHNYA ---
// GET SATU UNIVERSITAS BERDASARKAN ID
router.get('/universitas/public/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const university = await prisma.universitas.findUnique({
      where: {
        id: id,
        status: 'Aktif'
      },
      select: {
        id: true,
        nama: true,
        logoUrl: true
      }
    });

    if (!university) {
      return res.status(404).json({ message: 'Universitas tidak ditemukan atau tidak aktif.' });
    }

    res.status(200).json(university);
  } catch (error) {
    console.error(`Gagal mengambil data untuk universitas ${id}:`, error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});
// --- AKHIR DARI BLOK BARU ---


// GET SEMUA UNIVERSITAS (BISA FILTER BY STATUS)
router.get('/universitas', async (req, res) => {
  const { status } = req.query;
  try {
    const whereClause = status ? { status: status } : {};
    const allUniversitas = await prisma.universitas.findMany({
      where: whereClause,
      orderBy: { nama: 'asc' }
    });
    res.status(200).json(allUniversitas);
  } catch (error) {
    console.error("Gagal mengambil data universitas:", error);
    res.status(500).json({ message: "Gagal mengambil data universitas." });
  }
});

// GET FAKULTAS BERDASARKAN ID UNIVERSITAS
router.get('/fakultas/:universitasId', async (req, res) => {
  const { universitasId } = req.params;
  try {
    const allFakultas = await prisma.fakultas.findMany({
      where: { universitasId: universitasId },
      orderBy: { nama: 'asc' }
    });
    res.status(200).json(allFakultas);
  } catch (error) {
    console.error(`Gagal mengambil data fakultas untuk universitas ${universitasId}:`, error);
    res.status(500).json({ message: "Gagal mengambil data fakultas." });
  }
});

// --- POST Endpoints ---

// POST UNIVERSITAS BARU (DENGAN LOGIKA LENGKAP)
router.post('/universitas', upload.single('logo'), async (req, res) => {
  const { nama } = req.body;
  const logoFile = req.file;

  if (!nama) {
    return res.status(400).json({ message: "Nama universitas wajib diisi." });
  }
  if (!logoFile) {
    return res.status(400).json({ message: "Logo universitas wajib diupload." });
  }

  try {
    const newUniversitas = await prisma.universitas.create({
      data: {
        nama: nama,
        logoUrl: logoFile.path.replace(/\\/g, "/")
      }
    });
    res.status(201).json(newUniversitas);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: `Universitas dengan nama "${nama}" sudah ada.` });
    }
    console.error("Gagal membuat universitas baru:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
});

// POST FAKULTAS BARU
router.post('/fakultas', async (req, res) => {
  const { nama, universitasId } = req.body;

  if (!nama || !universitasId) {
    return res.status(400).json({ message: "Nama fakultas dan ID universitas wajib diisi." });
  }
  
  try {
    const newFakultas = await prisma.fakultas.create({
      data: {
        nama: nama,
        universitasId: universitasId,
      }
    });
    res.status(201).json(newFakultas);
  } catch(error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: `Fakultas "${nama}" sudah ada di universitas ini.` });
    }
    console.error("Gagal membuat fakultas baru:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
});

// --- UPDATE & DELETE Endpoints ---

// UPDATE STATUS UNIVERSITAS
router.patch('/universitas/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Aktif', 'Arsip'].includes(status)) {
        return res.status(400).json({ message: "Status tidak valid. Gunakan 'Aktif' atau 'Arsip'." });
    }
    try {
        const updatedUniversitas = await prisma.universitas.update({
            where: { id: id },
            data: { status: status },
        });
        res.status(200).json(updatedUniversitas);
    } catch (error) {
        console.error(`Gagal mengubah status universitas ${id}:`, error);
        res.status(500).json({ message: "Gagal mengubah status universitas." });
    }
});

// HAPUS UNIVERSITAS (PERMANEN)
router.delete('/universitas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.universitas.delete({
            where: { id: id }
        });
        res.status(200).json({ message: `Universitas dengan ID ${id} berhasil dihapus secara permanen.` });
    } catch (error) {
        console.error(`Gagal menghapus universitas ${id}:`, error);
        res.status(500).json({ message: "Gagal menghapus universitas." });
    }
});

// HAPUS FAKULTAS (PERMANEN)
router.delete('/fakultas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.fakultas.delete({
            where: { id: id }
        });
        res.status(200).json({ message: `Fakultas dengan ID ${id} berhasil dihapus secara permanen.` });
    } catch (error) {
        console.error(`Gagal menghapus fakultas ${id}:`, error);
        res.status(500).json({ message: "Gagal menghapus fakultas." });
    }
});


module.exports = router;