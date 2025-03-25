import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get DATABASE_URL from environment variable
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Parse connection string to extract parts
// Format: postgres://user:password@host:port/database
const url = new URL(connectionString);
const dbName = url.pathname.substring(1); // Remove leading slash
const hostParts = (url.host || "").split(":");
const host = hostParts[0] || "localhost";
const port = hostParts[1] ? parseInt(hostParts[1], 10) : 5432;
const username = url.username;
const password = url.password;

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host,
    port,
    user: username,
    password,
    database: dbName,
  },
  verbose: true,
  strict: true,
});
