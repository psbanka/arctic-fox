import { Context } from "hono";
import { verifyToken, JwtUser } from "../utils/auth";
import { createInsufficientPermissionsError } from "../utils/result";
import type { ContentfulStatusCode } from "hono/utils/http-status";

// Define types for context variables
declare module "hono" {
  interface ContextVariableMap {
    user: JwtUser;
  }
}

// Authentication middleware
export async function authenticate(c: Context, next: () => Promise<void>): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    return c.json({ message: "Authentication required" }, 401 as ContentfulStatusCode);
  }

  // Check if the header starts with "Bearer "
  if (!authHeader.startsWith("Bearer ")) {
    return c.json({ message: "Invalid authentication format" }, 401 as ContentfulStatusCode);
  }

  // Extract the token from the header
  const token = authHeader.slice(7);

  // Verify the token
  const userResult = verifyToken(token);

  // If error, return appropriate status code and message
  if (userResult.isErr()) {
    const error = userResult.error;
    return c.json({
      message: error.message,
      type: error.type
    }, (error.statusCode || 401) as ContentfulStatusCode);
  }

  // Set the user in the context
  c.set("user", userResult.value);

  // Continue to the next middleware or handler
  return await next();
}

// Admin authorization middleware
export async function requireAdmin(c: Context, next: () => Promise<void>): Promise<Response | void> {
  const user = c.get("user");

  if (!user.isAdmin) {
    const error = createInsufficientPermissionsError("Admin access required");
    return c.json({
      message: error.message,
      type: error.type
    }, (error.statusCode || 403) as ContentfulStatusCode);
  }

  return await next();
}
