import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"; // Changed to import type

// Load environment variables
dotenv.config();

// Initialize database connection based on environment
let db: PostgresJsDatabase<typeof schema>;

// Try to establish a database connection
try {
  // Get DATABASE_URL from environment or build it from components
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

  // If we have a connection string, establish a real database connection
  if (connectionString) {
    // Create a PostgreSQL pool
    const pool = new Pool({
      connectionString,
      // Add a timeout to fail fast if the database is not reachable
      connectionTimeoutMillis: 5000,
    });

    // Test the connection with a ping
    pool.query('SELECT * FROM users').then((output) => {
      console.log(output.rowCount);
      console.log("🟢 Successfully connected to PostgreSQL database");
    }).catch(err => {
      console.error("❌ Database connection test failed:", err.message);
      console.log("⚠️ Application will continue in MSW mode");
    });

    // Create Drizzle instance with schema
    db = drizzle(pool, { schema });
    // const output = await db.query.users.findMany()
    // console.log(output.length);
  } else {
    // If no connection details are provided, use a mock implementation
    console.log("🟠 No database connection details found, using mock service worker");
    setupMockDb();
  }
} catch (error) {
  console.error("❌ Failed to connect to database:", error instanceof Error ? error.message : error);
  console.log("🟠 Falling back to mock service worker");
  setupMockDb();
}

// Helper function to setup a mock database
function setupMockDb() {
  db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
    get: (_target, prop) => {
      // Return a function that logs a warning for any database operation
      if (prop === 'query' || prop === 'select' || prop === 'insert' ||
          prop === 'update' || prop === 'delete' || prop === 'transaction') {
        return (...args: unknown[]) => {
          console.warn(`Database operation '${String(prop)}' called in MSW mode`,
            args.length > 0 ? `with ${args.length} arguments` : '');
          return Promise.resolve([]);
        };
      }
      return () => {};
    }
  });
}

// Export the database instance
export { db };

// Create a type helper to enable proper type inference
type Schema = typeof schema;
export type DrizzleDB = PostgresJsDatabase<Schema>;

// Export all schema objects for easier imports
export * from "./schema";
