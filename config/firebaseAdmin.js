const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// --- PERUBAHAN UTAMA UNTUK DEPLOYMENT ---

// 1. Ambil kredensial yang sudah kita simpan sebagai string di Railway
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

// 2. Deklarasikan variabel serviceAccount di luar blok if
let serviceAccount;

// 3. Pengecekan keamanan: pastikan environment variable tidak kosong
if (serviceAccountString) {
  try {
    // Ubah kembali (parse) string tersebut menjadi objek JSON yang valid
    serviceAccount = JSON.parse(serviceAccountString);
  } catch (e) {
    console.error('Gagal mem-parsing FIREBASE_SERVICE_ACCOUNT:', e);
    // Hentikan aplikasi jika kredensial tidak valid agar tidak berjalan dalam kondisi error
    process.exit(1); 
  }
} else {
  // Jika aplikasi berjalan di lingkungan yang tidak memiliki env var (misal, development awal)
  // dan Anda masih ingin menggunakan file lokal, Anda bisa menambahkannya di sini.
  // Namun untuk deployment, kita anggap env var WAJIB ADA.
  console.error('FIREBASE_SERVICE_ACCOUNT environment variable tidak ditemukan.');
  process.exit(1);
}

// 4. Inisialisasi Firebase Admin dengan kredensial yang sudah valid
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 5. Sisa kode tidak berubah
const db = getFirestore();

module.exports = { admin, db };