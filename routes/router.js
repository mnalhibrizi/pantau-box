const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../lib/db');
const userMiddleware = require('../Middleware/users');

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

module.exports = router;