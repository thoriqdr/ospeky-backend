const express = require('express');
const cors = require('cors');
const multer = require('multer'); // Impor multer
const path = require('path');   // Impor path untuk mengelola path file
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// --- Impor Rute ---
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const categoryRoutes = require('./routes/categoryRoutes.js');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const initCronJobs = require('./services/cronJobs');




const app = express();
const prisma = new PrismaClient();

// Middleware
const corsOptions = {
  // Mengubah string yang dipisahkan koma dari .env menjadi array URL
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false,
  optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));
app.use(express.json());



// --- Konfigurasi Multer untuk Upload Gambar ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Folder tempat menyimpan gambar
  },
  filename: function (req, file, cb) {
    // Membuat nama file unik: timestamp + nama asli file
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// --- Rute Baru untuk Upload ---
// Endpoint ini hanya untuk menangani upload file gambar
app.post('/api/upload', upload.single('productImage'), (req, res) => {
  // Jika upload berhasil, req.file akan berisi informasi file
  if (req.file) {
    console.log('File uploaded:', req.file.path);
    // Kirim kembali path file yang bisa diakses publik
    res.status(200).json({
      message: 'File berhasil di-upload!',
      // Ganti backslash (\) dengan slash (/) untuk URL yang valid di semua sistem
      imageUrl: `/${req.file.path.replace(/\\/g, "/")}` 
    });
  } else {
    res.status(400).json({ message: 'Upload file gagal.' });
  }
});

// --- Membuat folder 'uploads' bisa diakses publik ---
// Ini agar gambar bisa ditampilkan di browser
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));




// --- Menggunakan Semua Rute ---
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

// ... sisa kode (rute pengujian, app.listen) tetap sama ...
app.get('/', (req, res) => res.send('<h1>API Ospeky Aktif!</h1>'));
initCronJobs();
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server Ospeky berjalan di http://localhost:${PORT}`));