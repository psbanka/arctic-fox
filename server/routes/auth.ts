import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import type {
  UserModel
} from "../db/types";
import { generateToken, comparePassword, hashPassword } from "../utils/auth";
import { authenticate, requireAdmin } from "../middleware/auth";
import {
  createDatabaseQueryError,
  createInvalidCredentialsError,
  createDuplicateRecordError,
  type AppResult
} from "../utils/result";
import { ok, err } from "neverthrow";
import type { ContentfulStatusCode } from "hono/utils/http-status";

// Import shared types
import type {
  User,
  CreateUserRequest,
  AuthResponse
} from "@shared/types";

const authRoutes = new Hono();

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Create user schema - use the CreateUserRequest type for validation
const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  isAdmin: z.boolean().optional().default(false),
}) satisfies z.ZodType<CreateUserRequest>;

/**
 * Get a user by username
 */
async function getUserByUsername(username: string): Promise<AppResult<UserModel>> {
  try {
    console.log('----------------------- a');
    const userModel = await db.query.users.findFirst({
      where: eq(users.username, username),
    }) as UserModel | undefined;
    console.log('----------------------- a');

    if (!userModel) {
      return err(createInvalidCredentialsError());
    }

    return ok(userModel);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to find user", error));
  }
}

/**
 * Check if a username already exists
 */
async function checkUsernameExists(username: string): Promise<AppResult<boolean>> {
  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    }) as UserModel | undefined;

    if (existingUser) {
      return err(createDuplicateRecordError("Username already exists"));
    }

    return ok(false);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to check username", error));
  }
}

/**
 * Get all users
 */
async function getAllUsers(): Promise<AppResult<UserModel[]>> {
  try {
    const userModelsList = await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    }).from(users) as UserModel[];

    return ok(userModelsList);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch users", error));
  }
}

/**
 * Create a new user
 */
async function createUser(userData: CreateUserRequest, passwordHash: string): Promise<AppResult<UserModel>> {
  try {
    const [newUserModel] = await db
      .insert(users)
      .values({
        username: userData.username,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isAdmin: userData.isAdmin || false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        firstName: users.firstName,
        lastName: users.lastName,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      });

    return ok(newUserModel);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to create user", error));
  }
}

// Login endpoint
authRoutes.post(
  "/login",
  zValidator("json", loginSchema),
  async (c) => {
    const { username, password } = await c.req.valid("json");

    // Get user by username
    const userResult = await getUserByUsername(username);

    if (userResult.isErr()) {
      const error = userResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 401) as ContentfulStatusCode
      );
    }

    const userModel = userResult.value;

    // Verify password
    const isValidPassword = await comparePassword(password, userModel.passwordHash);

    if (!isValidPassword) {
      const error = createInvalidCredentialsError();
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 401) as ContentfulStatusCode
      );
    }

    // Generate JWT token
    const user: User = {
      id: userModel.id,
      username: userModel.username,
      firstName: userModel.firstName,
      lastName: userModel.lastName,
      isAdmin: userModel.isAdmin,
    };

    const token = generateToken(user);

    // Return user data and token
    const response: AuthResponse = {
      user,
      token,
    };

    return c.json(response);
  }
);

// Current user endpoint
authRoutes.get("/me", authenticate, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

// Admin-only: Create user
authRoutes.post(
  "/users",
  zValidator("json", createUserSchema),
  authenticate,
  requireAdmin,
  async (c) => {
    try {
      const userData = await c.req.valid("json");

      // Check if username already exists
      const usernameExistsResult = await checkUsernameExists(userData.username);

      if (usernameExistsResult.isErr()) {
        const error = usernameExistsResult.error;
        // If it's a duplicate record error
        if (error.type === "DUPLICATE_RECORD") {
          return c.json(
            { message: error.message, type: error.type },
            (error.statusCode || 409) as ContentfulStatusCode
          );
        }
        // Any other error
        return c.json(
          { message: error.message, type: error.type },
          (error.statusCode || 500) as ContentfulStatusCode
        );
      }

      // Hash password
      const passwordHashResult = await hashPassword(userData.password);
      if (passwordHashResult.isErr()) {
        const error = passwordHashResult.error;
        return c.json({ message: error.message, type: error.type }, error.statusCode as ContentfulStatusCode);
      }

      // Create user
      const userResult = await createUser(userData, passwordHashResult.value);
      if (userResult.isErr()) {
        const error = userResult.error;
        return c.json({ message: error.message, type: error.type }, error.statusCode as ContentfulStatusCode);
      }

      // Extract the user model without the password hash
      const userModel = userResult.value;
      const user: User = {
        id: userModel.id,
        username: userModel.username,
        firstName: userModel.firstName,
        lastName: userModel.lastName,
        isAdmin: userModel.isAdmin,
      };

      return c.json({ user }, 201 as ContentfulStatusCode);
    } catch (error) {
      const appError = createDatabaseQueryError('Failed to create user', error);
      return c.json({ message: appError.message, type: appError.type }, appError.statusCode as ContentfulStatusCode);
    }
  }
);

// Admin-only: Get all users
authRoutes.get("/users", authenticate, requireAdmin, async (c) => {
  const usersResult = await getAllUsers();

  if (usersResult.isErr()) {
    const error = usersResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode
    );
  }

  const usersList = usersResult.value.map((user) => ({
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin,
  }));

  return c.json({ users: usersList });
});

export default authRoutes;
