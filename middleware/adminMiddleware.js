const adminOnly = (req, res, next) => {
  // Middleware ini dijalankan SETELAH middleware 'protect',
  // jadi kita sudah punya akses ke req.user
  if (req.user && req.user.role === 'ADMIN') {
    next(); // Jika role adalah ADMIN, izinkan permintaan untuk melanjutkan
  } else {
    // Jika bukan, kirim error 403 Forbidden (Akses Ditolak)
    res.status(403).json({ message: 'Akses ditolak. Rute ini hanya untuk Admin.' });
  }
};

module.exports = { adminOnly };