import mysql from "mysql2/promise";

const connectionDev = {
  host: "localhost",
  user: "root",
  password: "",
  database: "payment_system",
};

const connectionProd = {
  host: "mysql",
  port: 3306,
  user: "karitiang",
  password: "@KotoMalintang",
  database: "db_kujang",
};

// Select koneksi database berdasarkan environment
const connectionConfig =
  process.env.NODE_ENV === "production" ? connectionProd : connectionDev;

const db = mysql.createPool(connectionConfig);

export default db;
