import argon2 from "argon2";
import db from "../config/Database.js";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";

const secretKey = process.env.JWT_SECRET || "your_jwt_secret_key";

export const registerUser = async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  // Validasi parameter
  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({
      status: 102,
      message: "Semua field harus diisi.",
      data: null,
    });
  }

  // Validasi format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: 102,
      message: "Parameter email tidak sesuai format",
      data: null,
    });
  }

  // Validasi panjang password
  if (password.length < 8) {
    return res.status(400).json({
      status: 102,
      message: "Password harus memiliki panjang minimal 8 karakter",
      data: null,
    });
  }

  try {
    // Cek apakah email sudah terdaftar
    const [existingUser] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        status: 102,
        message: "Email sudah terdaftar",
        data: null,
      });
    }

    const hashedPassword = await argon2.hash(password, 10);

    await db.execute(
      "INSERT INTO users (email, first_name, last_name, password) VALUES (?, ?, ?, ?)",
      [email, first_name, last_name, hashedPassword]
    );

    return res.status(201).json({
      status: 0,
      message: "Registrasi berhasil silahkan login",
      data: null,
    });
  } catch (error) {
    console.error("Error saat registrasi:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error.",
      data: null,
    });
  }
};

export const loginUser = async (req, res) => {
  await body("email")
    .isEmail()
    .withMessage("Paramter email tidak sesuai format")
    .run(req);
  await body("password")
    .isLength({ min: 8 })
    .withMessage("Password harus memiliki panjang minimal 8 karakter")
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 102,
      message: errors.array()[0].msg,
      data: null,
    });
  }

  const { email, password } = req.body;

  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({
        status: 103,
        message: "Username atau password salah",
        data: null,
      });
    }

    const user = rows[0];

    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      return res.status(401).json({
        status: 103,
        message: "Username atau password salah",
        data: null,
      });
    }

    const payload = { email: user.email };
    const token = jwt.sign(payload, secretKey, { expiresIn: "12h" });

    return res.status(200).json({
      status: 0,
      message: "Login Sukses",
      data: { token },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: null,
    });
  }
};

// Controller untuk get profile
export const getProfile = async (req, res) => {
  try {
    const userEmail = req.user.email;

    const [rows] = await db.execute(
      "SELECT email, first_name, last_name, profile_image FROM users WHERE email = ?",
      [userEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "User not found",
        data: null,
      });
    }

    const user = rows[0];

    return res.status(200).json({
      status: 0,
      message: "Sukses",
      data: {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image || null,
      },
    });
  } catch (error) {
    console.error("Profile fetching error:", error);

    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: null,
    });
  }
};

// Controller untuk profile update
export const updateProfile = async (req, res) => {
  const { first_name, last_name } = req.body;
  const userEmail = req.user.email;

  if (!first_name || !last_name) {
    return res.status(400).json({
      status: 400,
      message: "First name dan last name diperlukan",
      data: null,
    });
  }

  try {
    const [result] = await db.execute(
      "UPDATE users SET first_name = ?, last_name = ? WHERE email = ?",
      [first_name, last_name, userEmail]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 404,
        message: "User tidak ditemukan atau tidak ada perubahan data",
        data: null,
      });
    }

    const [updatedUser] = await db.execute(
      "SELECT email, first_name, last_name, profile_image FROM users WHERE email = ?",
      [userEmail]
    );

    const user = updatedUser[0];

    return res.status(200).json({
      status: 0,
      message: "Update Profile berhasil",
      data: {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image || null,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: null,
    });
  }
};

// Controller untuk profile image upload
export const uploadProfileImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 102,
      message: "Format Image tidak sesuai",
      data: null,
    });
  }

  const image = req.file.path;
  const userEmail = req.user.email;

  try {
    const [user] = await db.execute("SELECT * FROM users WHERE email = ?", [
      userEmail,
    ]);

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: "User not found",
        data: null,
      });
    }

    await db.execute("UPDATE users SET profile_image = ? WHERE email = ?", [
      image,
      userEmail,
    ]);

    const user1 = user[0];

    return res.status(200).json({
      status: 0,
      message: "Update Profile Image berhasil",
      data: {
        email: userEmail,
        first_name: user1.first_name,
        last_name: user1.last_name,
        profile_image: image,
      },
    });
  } catch (error) {
    console.error("Error updating profile image:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: null,
    });
  }
};
