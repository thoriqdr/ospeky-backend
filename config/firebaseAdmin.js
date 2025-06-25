const admin = require('firebase-admin');
// 1. Impor getFirestore
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 2. Inisialisasi service Firestore
const db = getFirestore();

// 3. Ekspor 'db' bersama dengan 'admin'
module.exports = { admin, db };