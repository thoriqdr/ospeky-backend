// backend/routes/authRoutes.js (Final dengan Logika Account Linking)

const express = require('express');
const { admin } = require('../config/firebaseAdmin');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Rute pendaftaran email/password (tidak berubah)
router.post('/register', async (req, res) => {
  const { email, password, nama, nomorHp } = req.body;
  if (!email || !password || !nama) {
    return res.status(400).json({ message: 'Email, password, dan nama wajib diisi.' });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nama,
    });
    await prisma.user.create({
      data: {
        firebaseUid: userRecord.uid,
        email: email,
        nama: nama,
        nomorHp: nomorHp || '',
        role: 'CUSTOMER',
      },
    });
    res.status(201).json({ message: 'Registrasi berhasil!' });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
        return res.status(400).json({ message: 'Email ini sudah terdaftar.' });
    }
    console.error('SERVER SIGNUP ERROR:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});


// Rute login/signup Google dengan logika yang lebih cerdas
router.post('/google', async (req, res) => {
  const { token } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email, name } = decodedToken;

    // 1. Cek dulu berdasarkan firebaseUid (kasus paling umum untuk login berulang)
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
    });

    if (user) {
      // Jika ditemukan via UID, ini pengguna lama. Login berhasil.
      return res.status(200).json({ message: "Login Google berhasil", user, isNewUser: false });
    }

    // 2. Jika tidak ditemukan via UID, cek berdasarkan email (kasus penautan akun)
    user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (user) {
      // Pengguna sudah ada (dibuat via email/pass), tapi ini login Google pertamanya.
      // Tautkan akunnya dengan mengupdate firebaseUid.
      const updatedUser = await prisma.user.update({
        where: { email: email },
        data: { firebaseUid: uid },
      });
      return res.status(200).json({ message: "Akun berhasil ditautkan", user: updatedUser, isNewUser: false });
    }
    
    // 3. Jika tidak ditemukan via UID maupun email, ini adalah pengguna yang benar-benar baru.
    const newUser = await prisma.user.create({
      data: {
        firebaseUid: uid,
        email: email,
        nama: name,
        role: 'CUSTOMER',
      }
    });
    return res.status(201).json({ message: "Pengguna baru dibuat", user: newUser, isNewUser: true });

  } catch (error) {
    console.error("GOOGLE AUTH ERROR DI BACKEND:", error);
    res.status(401).json({ message: "Login Google gagal, token tidak valid atau server error." });
  }
});


module.exports = router;