import { Result, err, ok } from 'neverthrow';

// Re-export ok and err functions from neverthrow
export { ok, err };

// Define the standard error types we'll use throughout the application
export enum ErrorType {
  // Database errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',

  // Authentication errors
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // General errors
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

// AppError interface that all our errors will implement
export interface AppError {
  type: ErrorType;
  message: string;
  cause?: unknown;
  statusCode?: number;
}

// Function to create a database connection error
export function createDatabaseConnectionError(message: string, cause?: unknown): AppError {
  return {
    type: ErrorType.DATABASE_CONNECTION_ERROR,
    message,
    cause,
    statusCode: 500
  };
}

// Function to create a database query error
export function createDatabaseQueryError(message: string, cause?: unknown): AppError {
  return {
    type: ErrorType.DATABASE_QUERY_ERROR,
    message,
    cause,
    statusCode: 500
  };
}

// Function to create a record not found error
export function createRecordNotFoundError(message: string): AppError {
  return {
    type: ErrorType.RECORD_NOT_FOUND,
    message,
    statusCode: 404
  };
}

// Function to create a duplicate record error
export function createDuplicateRecordError(message: string): AppError {
  return {
    type: ErrorType.DUPLICATE_RECORD,
    message,
    statusCode: 409
  };
}

// Function to create an authentication error
export function createAuthenticationError(message: string): AppError {
  return {
    type: ErrorType.AUTHENTICATION_ERROR,
    message,
    statusCode: 401
  };
}

// Function to create an invalid credentials error
export function createInvalidCredentialsError(message = 'Invalid username or password'): AppError {
  return {
    type: ErrorType.INVALID_CREDENTIALS,
    message,
    statusCode: 401
  };
}

// Function to create a token expired error
export function createTokenExpiredError(message = 'Token has expired'): AppError {
  return {
    type: ErrorType.TOKEN_EXPIRED,
    message,
    statusCode: 401
  };
}

// Function to create an insufficient permissions error
export function createInsufficientPermissionsError(message = 'Insufficient permissions'): AppError {
  return {
    type: ErrorType.INSUFFICIENT_PERMISSIONS,
    message,
    statusCode: 403
  };
}

// Function to create a validation error
export function createValidationError(message: string): AppError {
  return {
    type: ErrorType.VALIDATION_ERROR,
    message,
    statusCode: 400
  };
}

// Function to create an invalid input error
export function createInvalidInputError(message: string): AppError {
  return {
    type: ErrorType.INVALID_INPUT,
    message,
    statusCode: 400
  };
}

// Function to create an unexpected error
export function createUnexpectedError(message: string, cause?: unknown): AppError {
  return {
    type: ErrorType.UNEXPECTED_ERROR,
    message,
    cause,
    statusCode: 500
  };
}

// Function to create an external service error
export function createExternalServiceError(message: string, cause?: unknown): AppError {
  return {
    type: ErrorType.EXTERNAL_SERVICE_ERROR,
    message,
    cause,
    statusCode: 503
  };
}

// Type aliases for common Result types
export type AppResult<T> = Result<T, AppError>;
