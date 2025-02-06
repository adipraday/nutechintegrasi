import argon2 from "argon2";
import db from "../config/Database.js"; // Import the DB connection from your config file
import jwt from "jsonwebtoken";
import upload from "../config/MulterConfig.js";
import { body, validationResult } from "express-validator";
import multer from "multer";

const secretKey = process.env.JWT_SECRET || "your_jwt_secret_key"; // Set your JWT secret

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert pengguna baru ke database
    await db.execute(
      "INSERT INTO users (email, first_name, last_name, password) VALUES (?, ?, ?, ?)",
      [email, first_name, last_name, hashedPassword]
    );

    // Response berhasil
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
  // Validasi input
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
      message: errors.array()[0].msg, // Ambil pesan error pertama
      data: null,
    });
  }

  const { email, password } = req.body;

  try {
    // Cek apakah user dengan email tersebut ada di database
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

    // Cek apakah password cocok menggunakan argon2.verify
    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      return res.status(401).json({
        status: 103,
        message: "Username atau password salah",
        data: null,
      });
    }

    // Generate token JWT
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

// Profile Controller
export const getProfile = async (req, res) => {
  try {
    // Extract email from JWT payload (decoded by middleware)
    const userEmail = req.user.email;

    // Fetch user data from the database using the email from JWT
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

    // Respond with user data
    return res.status(200).json({
      status: 0,
      message: "Sukses",
      data: {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image || null, // Provide null if no profile image
      },
    });
  } catch (error) {
    console.error("Profile fetching error:", error);

    // Handle unexpected errors
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: null,
    });
  }
};

// Profile Update Controller
export const updateProfile = async (req, res) => {
  const { first_name, last_name } = req.body; // Ambil data dari request body
  const userEmail = req.user.email; // Email user dari JWT payload (didecode oleh middleware)

  // Validasi input
  if (!first_name || !last_name) {
    return res.status(400).json({
      status: 400,
      message: "First name dan last name diperlukan",
      data: null,
    });
  }

  try {
    // Update profil pengguna di database
    const [result] = await db.execute(
      "UPDATE users SET first_name = ?, last_name = ? WHERE email = ?",
      [first_name, last_name, userEmail]
    );

    // Periksa apakah ada baris yang diperbarui
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 404,
        message: "User tidak ditemukan atau tidak ada perubahan data",
        data: null,
      });
    }

    // Ambil data pengguna yang telah diperbarui untuk response
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
        profile_image: user.profile_image || null, // Default ke null jika profile_image tidak ada
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

// Profile Image Upload Controller
export const uploadProfileImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 102,
      message: "Format Image tidak sesuai",
      data: null,
    });
  }

  const image = req.file.path; // Access the file path after it has been uploaded
  const userEmail = req.user.email; // Extract the email from the JWT payload

  try {
    // Get the user based on the email from JWT
    const [user] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [userEmail] // Get the user by email from JWT
    );

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: "User not found",
        data: null,
      });
    }

    // Update the user's profile_image field with the filename
    await db.execute(
      "UPDATE users SET profile_image = ? WHERE email = ?",
      [image, userEmail] // Use the image path and email to update
    );

    return res.status(200).json({
      status: 0,
      message: "Update Profile Image berhasil",
      data: {
        email: userEmail, // Send the user's email
        profile_image: image, // Send the file path
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
