const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');


const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

const serviceAccount = JSON.parse(serviceAccountString);



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

module.exports = { admin, db };