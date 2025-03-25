import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { prettyJSON } from "hono/pretty-json";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import householdRoutes from "./routes/households";
import categoryRoutes from "./routes/categories";
import templateRoutes from "./routes/templates";
import monthlyPlanRoutes from "./routes/monthly-plans";

// Load environment variables
dotenv.config();

// Create Hono app
const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", prettyJSON());

// Welcome route
app.get("/", (c) => {
  return c.json({
    message: "Welcome to the Family Task Manager API",
    version: "1.0.0",
  });
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Routes
app.route("/api/auth", authRoutes);
app.route("/api/households", householdRoutes);
app.route("/api/categories", categoryRoutes);
app.route("/api/templates", templateRoutes);
app.route("/api/monthly-plans", monthlyPlanRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ message: "Not Found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ message: "Internal Server Error" }, 500);
});

// Get port from environment variables or use default
const port = parseInt(process.env.PORT || "3000", 10);

console.log(`Starting server on port ${port}`);

// Start the server
export default {
  port,
  fetch: app.fetch,
};
