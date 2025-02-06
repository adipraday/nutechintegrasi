import mysql from "mysql2/promise"; // Use the promise-based version of mysql2

// Configure the database connection (you can adjust for dev or prod)
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

// Select the correct connection based on environment
const connectionConfig =
  process.env.NODE_ENV === "production" ? connectionProd : connectionDev;

// Create the database connection and export it
const db = mysql.createPool(connectionConfig);

export default db;
