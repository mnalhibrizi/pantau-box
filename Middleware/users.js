const jwt = require('jsonwebtoken');

module.exports = {
  validateRegister: (req, res, next) => {
    // NIK dengan panjang 16
    if (!req.body.nik || req.body.nik.length !== 16) {
      return res.status(400).send({
        message: 'Masukkan NIK yang valid dengan panjang 16 karakter',
      });
    }
    if (!req.body.nik_repeat || req.body.nik !== req.body.nik_repeat) {
      return res.status(400).send({
        message: 'NIK anda tidak valid',
      });
    }
    next();
  },
  isLoggedIn: (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(400).send({
        message: 'Your session is not valid!',
      });
    }
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, 'SECRETKEY');
      req.userData = decoded;
      req.nik = decoded.nik; // Menyimpan NIK dari decoded token ke req.nik
      next();
    } catch (err) {
      return res.status(400).send({
        message: 'Your session is not valid!',
      });
    }
  },
};
