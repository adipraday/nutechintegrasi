import express from "express";
import dotenv from "dotenv";
import db from "./config/Database.js";
import cors from "cors";
import router from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env;

const connectDB = async () => {
  try {
    // Test the database connection
    const [rows] = await db.execute("SELECT 1 + 1 AS solution");
    console.log("Database Connected...");
    console.log("Query result:", rows);
  } catch (error) {
    console.error("Database connection error:", error);
  }
};
connectDB();

const allowedOrigins = [
  "http://0.0.0.0:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://172.17.0.2:3000",
  "http://103.159.112.249:3000",
];
const corsOptions = {
  origin: allowedOrigins,
  exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(router);

// Default route
app.get("/", (req, res) => {
  res.send("Nutech - NodeJS Rest API");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
