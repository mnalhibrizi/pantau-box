const express = require('express');
const router = express.Router();
// Auth library
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Upload library
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const db = require('../lib/db');
const upload = multer({ dest: 'uploads/' });
const userMiddleware = require('../Middleware/users');

const bucketName = process.env.STORAGE_BUCKET_NAME;
const keyFilename = path.join('./pantau-box-storage-key.json');
const storage = new Storage({
  keyFilename: keyFilename,
  projectId: process.env.PROJECT_ID, 
});
const bucket = storage.bucket(bucketName);

router.get('/healthcheck', (req, res) => {
    return res.status(200).json({ message: db.state });
});

router.post('/login', (req, res) => {
    const { nik } = req.body;

    // Cek apakah NIK memiliki panjang 16 karakter
    if (nik.length !== 16) {
        return res.status(400).json({ message: 'Invalid NIK' });
    }

    // Query ke database untuk mendapatkan data pengguna berdasarkan NIK
    const query = 'SELECT * FROM data_ktp WHERE nik = ?';
    db.query(query, [nik], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        // Cek apakah NIK ditemukan di database
        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verifikasi sukses, kirim pesan "verifikasi sukses" bersama dengan token JWT
        try {
            const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
            const token = jwt.sign({ nik }, JWT_SECRET_KEY, { expiresIn: '1h' });
            res.json({ message: 'Verifikasi sukses', token });
        } catch (e) {
            return res.status(404).json({ message: e.message });
        }
    });
});

router.post('/upload', upload.single('photo'), async (req, res) => {
    const { nik } = req.body; // Mengambil nilai NIK dari req.body
    const photoPath = req.file.path;
  
    // Mendapatkan ekstensi file foto yang diunggah
    const fileExtension = path.extname(req.file.originalname);
  
    // Membuat nama file baru berdasarkan NIK dan ekstensi file
    const newFileName = `${nik}${fileExtension}`;
  
    // Membuat path baru untuk foto dengan nama file baru
    const newPhotoPath = path.join(path.dirname(photoPath), newFileName);
  
    // Rename/mengganti nama file foto yang diunggah
    fs.renameSync(photoPath, newPhotoPath);
  
    try {
      // Upload gambar ke Google Cloud Storage
      await bucket.upload(newPhotoPath, {
        destination: newFileName,
        public: true, // Membuat gambar dapat diakses secara publik
        metadata: {
          contentType: req.file.mimetype
        }
      });
  
      // Hapus file lokal yang sudah diunggah
      fs.unlinkSync(newPhotoPath);
  
      // Dapatkan URL gambar yang diunggah
      const imageUrl = `https://storage.googleapis.com/${bucketName}/${newFileName}`;
  
      console.log('Photo uploaded!');
      return res.status(200).json({ error: false, message: 'Photo uploaded successfully', imageUrl });
    } catch (error) {
      console.error('Error uploading photo:', error);
      return res.status(500).json({ error: true, message: 'Internal server error' });
    }
});

module.exports = router;