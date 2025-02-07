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
  user: "root",
  password: "@kOTOmALINTANG2024",
  database: "payment_systems",
};

// Select koneksi database berdasarkan environment
const connectionConfig =
  process.env.NODE_ENV === "production" ? connectionProd : connectionDev;

const db = mysql.createPool(connectionConfig);

export default db;
