import jwt from "jsonwebtoken";
const secretKey = process.env.JWT_SECRET || "your_jwt_secret_key"; // Ganti dengan secret key yang sesuai

export const validateToken = (req, res, next) => {
  // Ambil token dari header Authorization
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({
      message: "Token is required",
    });
  }

  // Verifikasi token
  jwt.verify(token, secretKey, { maxAge: "12h" }, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        status: 108,
        message: "Invalid or expired token",
        data: null,
      });
    }

    // Jika token valid, simpan informasi user pada req.user
    req.user = decoded;
    next(); // Lanjutkan ke handler berikutnya
  });
};
