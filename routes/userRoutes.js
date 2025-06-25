// backend/routes/userRoutes.js (Versi Final & Lengkap)

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../config/firebaseAdmin');

const prisma = new PrismaClient();
const router = express.Router();

// --- RUTE PROFIL PENGGUNA ---
router.get('/profile', protect, async (req, res) => {
  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!userProfile) {
      return res.status(404).json({ message: 'Profil pengguna tidak ditemukan' });
    }
    res.json(userProfile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/profile', protect, async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: req.body,
    });
    const authUpdates = {};
    if (req.body.nama) authUpdates.displayName = req.body.nama;
    if (req.body.email) authUpdates.email = req.body.email;
    if (Object.keys(authUpdates).length > 0) {
      await admin.auth().updateUser(updatedUser.firebaseUid, authUpdates);
    }
    res.status(200).json({ message: 'Profil berhasil diperbarui', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- RUTE ALAMAT PENGGUNA ---

// GET semua alamat (sekarang bisa filter alamat utama)
router.get('/addresses', protect, async (req, res) => {
  try {
    const { isDefault } = req.query;
    const whereClause = { userId: req.user.id };
    if (isDefault === 'true') {
      whereClause.isAlamatUtama = true;
    }
    const addresses = await prisma.alamat.findMany({
      where: whereClause,
      orderBy: { isAlamatUtama: 'desc' }, 
    });
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({ message: 'Server error saat mengambil alamat' });
  }
});

// POST alamat baru
router.post('/addresses', protect, async (req, res) => {
  try {
    const newAddress = await prisma.alamat.create({
      data: { ...req.body, userId: req.user.id }
    });
    res.status(201).json(newAddress);
  } catch (error) {
    res.status(500).json({ message: 'Server error saat menambah alamat' });
  }
});

// --- RUTE BARU UNTUK MENGELOLA SATU ALAMAT ---

// GET satu alamat berdasarkan ID
router.get('/addresses/:id', protect, async (req, res) => {
  try {
    const address = await prisma.alamat.findUnique({
      where: { id: req.params.id },
    });
    if (!address || address.userId !== req.user.id) {
      return res.status(404).json({ message: 'Alamat tidak ditemukan' });
    }
    res.status(200).json(address);
  } catch (error) {
    res.status(500).json({ message: 'Server error saat mengambil detail alamat' });
  }
});

// PATCH (update) satu alamat berdasarkan ID
router.patch('/addresses/:id', protect, async (req, res) => {
  try {
    const addressToUpdate = await prisma.alamat.findFirst({
        where: { id: req.params.id, userId: req.user.id }
    });
    if (!addressToUpdate) {
        return res.status(404).json({ message: 'Alamat tidak ditemukan atau Anda tidak punya hak akses.' });
    }
    const updatedAddress = await prisma.alamat.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.status(200).json(updatedAddress);
  } catch (error) {
    res.status(500).json({ message: 'Server error saat memperbarui alamat' });
  }
});

// DELETE satu alamat berdasarkan ID
router.delete('/addresses/:id', protect, async (req, res) => {
  try {
    const addressToDelete = await prisma.alamat.findFirst({
        where: { id: req.params.id, userId: req.user.id }
    });
    if (!addressToDelete) {
        return res.status(404).json({ message: 'Alamat tidak ditemukan atau Anda tidak punya hak akses.' });
    }
    await prisma.alamat.delete({
      where: { id: req.params.id },
    });
    res.status(200).json({ message: 'Alamat berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Server error saat menghapus alamat' });
  }
});


module.exports = router;