import db from "../config/Database.js"; // Adjust the import path accordingly
import moment from "moment"; // To generate the current date for invoice

// Cek balances controller
export const getBalance = async (req, res) => {
  try {
    const { email } = req.user; // Get the email from the decoded JWT token

    // Query the database to get the user ID based on email
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

    // Query the database to get the balance for the user
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

    // Return the balance
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

// Controller to top-up balance
export const topUpBalance = async (req, res) => {
  try {
    const { top_up_amount } = req.body; // Get the top-up amount from the request body
    const { email } = req.user; // Get the email from the decoded JWT token

    // Validate the top-up amount
    if (isNaN(top_up_amount) || top_up_amount <= 0) {
      return res.status(400).json({
        status: 102,
        message:
          "Parameter amount hanya boleh angka dan tidak boleh lebih kecil dari 0",
        data: null,
      });
    }

    // Query the database to get the user ID based on email
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

    // Query the database to get the current balance for the user from the balances table
    const [balanceRows] = await db.query(
      "SELECT balance FROM balances WHERE user_id = ?",
      [userId]
    );

    let currentBalance = 0;

    if (balanceRows.length === 0) {
      // If no balance record exists, create a new balance record with the top-up amount
      await db.query("INSERT INTO balances (user_id, balance) VALUES (?, ?)", [
        userId,
        top_up_amount,
      ]);
      currentBalance = top_up_amount;
    } else {
      currentBalance = balanceRows[0].balance;
    }

    // Calculate the new balance
    const newBalance = currentBalance + top_up_amount;

    // Update the user's balance in the balances table
    await db.query("UPDATE balances SET balance = ? WHERE user_id = ?", [
      newBalance,
      userId,
    ]);

    // Generate a unique invoice number (e.g., using timestamp and user ID)
    const invoiceNumber = `TOPUP-${userId}-${Date.now()}`;

    // Log the transaction in the transactions table (using "TOPUP" as transaction type)
    await db.query(
      "INSERT INTO transactions (user_id, service_code, transaction_type, total_amount, invoice_number) VALUES (?, ?, ?, ?, ?)",
      [userId, "TOPUP", "TOPUP", top_up_amount, invoiceNumber]
    );

    // Return the new balance
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

// Controller to process a transaction
export const processTransaction = async (req, res) => {
  try {
    const { service_code } = req.body; // Get the service code from the request body
    const { email } = req.user; // Get the email from the decoded JWT token

    // Check if the service exists in the database
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

    // Query the database to get the current balance for the user from the balances table
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

    // Check if the user has enough balance
    if (currentBalance < service_tariff) {
      return res.status(400).json({
        status: 103,
        message: "Saldo tidak mencukupi untuk transaksi",
        data: null,
      });
    }

    // Deduct the service tariff from the user's balance
    const newBalance = currentBalance - service_tariff;

    // Update the user's balance in the balances table
    await db.query(
      "UPDATE balances SET balance = ? WHERE user_id = (SELECT id FROM users WHERE email = ?)",
      [newBalance, email]
    );

    // Generate a unique invoice number
    const invoiceNumber = `INV${moment().format("DDMMYYYY")}-${Math.floor(
      Math.random() * 1000
    )}`;

    const transactionType = "PAYMENT";
    const createdOn = moment().toISOString();

    // Get user ID based on email for the transaction log
    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    const userId = userRows[0].id;

    // Log the transaction in the transactions table
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

    // Return the transaction details including invoice number
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

// Controller to get transaction history
export const getTransactionHistory = async (req, res) => {
  try {
    const { email } = req.user; // Get the email from the decoded JWT token
    const { limit, offset } = req.query; // Get limit and offset from query params

    // Set default values for limit and offset
    const limitValue = limit ? parseInt(limit) : null; // If no limit is provided, fetch all records
    const offsetValue = offset ? parseInt(offset) : 0; // Default to 0 if offset is not provided

    // Get user ID based on email
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

    // Fetch transaction history for the user
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

    // Add limit and offset if limit is provided
    if (limitValue !== null) {
      query += ` LIMIT ? OFFSET ?`;
    }

    const queryParams =
      limitValue !== null ? [userId, limitValue, offsetValue] : [userId];
    const [transactions] = await db.query(query, queryParams);

    // Return the transaction history
    return res.status(200).json({
      status: 0,
      message: "Get History Berhasil",
      data: {
        offset: offsetValue,
        limit: limitValue || "all", // Show 'all' if no limit is applied
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
