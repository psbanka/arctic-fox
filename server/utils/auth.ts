import { hash, compare } from '@node-rs/bcrypt';
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {
  createAuthenticationError,
  createTokenExpiredError,
  createUnexpectedError,
  AppResult,
  ok,
  err
} from './result';

// Load environment variables
dotenv.config();

// Get JWT secret from environment variables
const jwtSecret = process.env.JWT_SECRET || "";
const jwtExpiry = process.env.JWT_EXPIRY || "7d";

if (!jwtSecret) {
  throw new Error("JWT_SECRET is not defined");
}

// Define user interface for token payload
export interface JwtUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}

// Function to generate JWT token
export function generateToken(user: JwtUser): string {
  return jwt.sign(user, jwtSecret, { expiresIn: jwtExpiry });
}

// Function to verify JWT token
export function verifyToken(token: string): AppResult<JwtUser> {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    return ok(decoded as JwtUser);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return err(createTokenExpiredError());
    }

    return err(createAuthenticationError('Failed to verify token'));
  }
}

// Function to hash password
export async function hashPassword(password: string): AppResult<string> {
  try {
    const saltRounds = 10;
    const hashedPassword = await hash(password, saltRounds);
    return ok(hashedPassword);
  } catch (error) {
    return err(createUnexpectedError('Failed to hash password', error));
  }
}

// Function to compare password with hash
export async function comparePassword(
  password: string,
  hash: string,
): AppResult<boolean> {
  try {
    const isMatch = await compare(password, hash);
    return ok(isMatch);
  } catch (error) {
    return err(createUnexpectedError('Failed to compare password', error));
  }
}
