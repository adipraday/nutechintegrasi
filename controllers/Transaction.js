import db from "../config/Database.js";
import moment from "moment";

// Controller untuk cek balances
export const getBalance = async (req, res) => {
  try {
    const { email } = req.user;

    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (userRows.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "User not found",
        data: null,
      });
    }

    const userId = userRows[0].id;

    const [balanceRows] = await db.query(
      "SELECT balance FROM balances WHERE user_id = ?",
      [userId]
    );

    if (balanceRows.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "Balance not found for this user",
        data: null,
      });
    }

    return res.status(200).json({
      status: 0,
      message: "Get Balance Berhasil",
      data: {
        balance: balanceRows[0].balance,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 500,
      message: "Database error while fetching balance",
      error: err.message,
    });
  }
};

// Controller untuk top-up balance
export const topUpBalance = async (req, res) => {
  try {
    const { top_up_amount } = req.body;
    const { email } = req.user;

    if (isNaN(top_up_amount) || top_up_amount <= 0) {
      return res.status(400).json({
        status: 102,
        message:
          "Parameter amount hanya boleh angka dan tidak boleh lebih kecil dari 0",
        data: null,
      });
    }

    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (userRows.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "User not found",
        data: null,
      });
    }

    const userId = userRows[0].id;

    const [balanceRows] = await db.query(
      "SELECT balance FROM balances WHERE user_id = ?",
      [userId]
    );

    let currentBalance = 0;

    if (balanceRows.length === 0) {
      await db.query("INSERT INTO balances (user_id, balance) VALUES (?, ?)", [
        userId,
        top_up_amount,
      ]);
      currentBalance = top_up_amount;
    } else {
      currentBalance = balanceRows[0].balance;
    }

    const newBalance = currentBalance + top_up_amount;

    await db.query("UPDATE balances SET balance = ? WHERE user_id = ?", [
      newBalance,
      userId,
    ]);

    const invoiceNumber = `TOPUP-${userId}-${Date.now()}`;

    await db.query(
      "INSERT INTO transactions (user_id, service_code, transaction_type, total_amount, invoice_number) VALUES (?, ?, ?, ?, ?)",
      [userId, "TOPUP", "TOPUP", top_up_amount, invoiceNumber]
    );

    return res.status(200).json({
      status: 0,
      message: "Top Up Balance berhasil",
      data: {
        balance: newBalance,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 500,
      message: "Database error while processing top-up",
      error: err.message,
    });
  }
};

// Controller untuk proses transaction
export const processTransaction = async (req, res) => {
  try {
    const { service_code } = req.body;
    const { email } = req.user;

    const [serviceRows] = await db.query(
      "SELECT service_code, service_name, service_tariff FROM services WHERE service_code = ?",
      [service_code]
    );

    if (serviceRows.length === 0) {
      return res.status(400).json({
        status: 102,
        message: "Service atau Layanan tidak ditemukan",
        data: null,
      });
    }

    const service = serviceRows[0];
    const { service_name, service_tariff } = service;

    const [balanceRows] = await db.query(
      "SELECT balance FROM balances WHERE user_id = (SELECT id FROM users WHERE email = ?)",
      [email]
    );

    if (balanceRows.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "User tidak ditemukan",
        data: null,
      });
    }

    const currentBalance = balanceRows[0].balance;

    if (currentBalance < service_tariff) {
      return res.status(400).json({
        status: 103,
        message: "Saldo tidak mencukupi untuk transaksi",
        data: null,
      });
    }

    const newBalance = currentBalance - service_tariff;

    await db.query(
      "UPDATE balances SET balance = ? WHERE user_id = (SELECT id FROM users WHERE email = ?)",
      [newBalance, email]
    );

    const invoiceNumber = `INV${moment().format("DDMMYYYY")}-${Math.floor(
      Math.random() * 1000
    )}`;

    const transactionType = "PAYMENT";
    const createdOn = moment().format("YYYY-MM-DD HH:mm:ss");

    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    const userId = userRows[0].id;

    await db.query(
      "INSERT INTO transactions (user_id, service_code, transaction_type, total_amount, invoice_number, created_on) VALUES (?, ?, ?, ?, ?, ?)",
      [
        userId,
        service_code,
        transactionType,
        service_tariff,
        invoiceNumber,
        createdOn,
      ]
    );

    return res.status(200).json({
      status: 0,
      message: "Transaksi berhasil",
      data: {
        invoice_number: invoiceNumber,
        service_code: service_code,
        service_name: service_name,
        transaction_type: transactionType,
        total_amount: service_tariff,
        created_on: createdOn,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 500,
      message: "Database error while processing transaction",
      error: err.message,
    });
  }
};

// Controller untuk transaction history
export const getTransactionHistory = async (req, res) => {
  try {
    const { email } = req.user;
    const { limit, offset } = req.query;

    const limitValue = limit ? parseInt(limit) : null;
    const offsetValue = offset ? parseInt(offset) : 0;

    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (userRows.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "User tidak ditemukan",
        data: null,
      });
    }

    const userId = userRows[0].id;

    let query = `
        SELECT 
          invoice_number, 
          transaction_type, 
          description, 
          total_amount, 
          created_on 
        FROM transactions 
        WHERE user_id = ? 
        ORDER BY created_on DESC
      `;

    if (limitValue !== null) {
      query += ` LIMIT ? OFFSET ?`;
    }

    const queryParams =
      limitValue !== null ? [userId, limitValue, offsetValue] : [userId];
    const [transactions] = await db.query(query, queryParams);

    return res.status(200).json({
      status: 0,
      message: "Get History Berhasil",
      data: {
        offset: offsetValue,
        limit: limitValue || "all",
        records: transactions,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 500,
      message: "Database error while fetching transaction history",
      error: err.message,
    });
  }
};
