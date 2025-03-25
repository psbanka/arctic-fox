import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Database connection configuration
let connectionString = process.env.DATABASE_URL;

// If DATABASE_URL is not provided, try to build it from components
if (!connectionString) {
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = process.env.POSTGRES_PORT || "5432";
  const database = process.env.POSTGRES_DB || "family_tasks";

  // Only build the connection string if user and password are provided
  if (user && password) {
    connectionString = `postgres://${user}:${password}@${host}:${port}/${database}`;
    // biome-ignore lint/suspicious/noConsoleLog: we like logs
    console.log("🔵 Database URL constructed from components");
    // biome-ignore lint/suspicious/noConsoleLog: <explanation>
    console.log(`🔵 Using host=${host}, port=${port}, database=${database}`);
  } else {
    // biome-ignore lint/suspicious/noConsoleLog: <explanation>
    console.log("⚠️ Missing database credentials in environment variables");
    // biome-ignore lint/suspicious/noConsoleLog: <explanation>
    console.log("⚠️ Please set POSTGRES_USER and POSTGRES_PASSWORD or DATABASE_URL");
  }
} else {
  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("🔵 Using DATABASE_URL from environment variables");
}

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

// Function to run migrations
async function runMigrations() {
  // Create a PostgreSQL pool
  const pool = new Pool({
    connectionString,
  });

  // Create a Drizzle instance
  const db = drizzle(pool);

  // Set up the migrator
  console.log("Running migrations...");

  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, "../../drizzle"),
    });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations();
