import { hash, compare } from '@node-rs/bcrypt';
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
import {
  createAuthenticationError,
  createTokenExpiredError,
  createUnexpectedError,
  type AppResult,
  ok,
  err
} from './result';

// Load environment variables
dotenv.config();

// Get JWT secret from environment variables
const jwtSecret = process.env.JWT_SECRET || "";

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
  const options: SignOptions = { expiresIn: 7 * 24 * 60 * 60 }; // 7 days in seconds
  return jwt.sign(user, Buffer.from(jwtSecret), options);
}

// Function to verify JWT token
export function verifyToken(token: string): AppResult<JwtUser> {
  try {
    const decoded = jwt.verify(token, Buffer.from(jwtSecret));
    return ok(decoded as JwtUser);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return err(createTokenExpiredError());
    }

    return err(createAuthenticationError('Failed to verify token'));
  }
}

// Function to hash password
export async function hashPassword(password: string): Promise<AppResult<string>> {
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
): Promise<AppResult<boolean>> {
  try {
    const isMatch = await compare(password, hash);
    return ok(isMatch);
  } catch (error) {
    return err(createUnexpectedError('Failed to compare password', error));
  }
}
