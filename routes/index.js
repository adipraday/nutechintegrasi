import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  uploadProfileImage,
} from "../controllers/Membership.js";
import { getBanner, getServices } from "../controllers/Information.js";
import {
  getBalance,
  topUpBalance,
  processTransaction,
  getTransactionHistory,
} from "../controllers/Transaction.js";
import { validateToken } from "../middleware/index.js";
import upload from "../config/MulterConfig.js";
import multer from "multer";

const router = express.Router();

// Module Membership.
router.post("/registration", registerUser);
router.post("/login", loginUser);
router.get("/profile", validateToken, getProfile);
router.put("/profile/update", validateToken, updateProfile);
router.put(
  "/profile/image",
  validateToken,
  (req, res, next) => {
    upload.single("profile_image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            status: 103,
            message: "Batas ukuran file hanya 5 mb",
            data: null,
          });
        }
      } else if (err) {
        return res.status(400).json({
          status: 102,
          message: "Format Image tidak sesuai",
          data: null,
        });
      }
      next();
    });
  },
  uploadProfileImage
);

// Module Information
router.get("/banner", validateToken, getBanner);
router.get("/services", validateToken, getServices);

// Module Information
router.get("/balance", validateToken, getBalance);
router.post("/topup", validateToken, topUpBalance);
router.post("/transaction", validateToken, processTransaction);
router.get("/transaction/history", validateToken, getTransactionHistory);

export default router;
