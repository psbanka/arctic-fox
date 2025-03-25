# Type Safety Guide for Drizzle ORM

This document provides guidance on how to maintain type safety when working with Drizzle ORM in the Family Task Manager application.

## Overview

We've set up a comprehensive type system to ensure proper type inference and type checking across the application. This helps catch errors at compile time rather than runtime, improving the reliability of the codebase.

## Core Type Definitions

### Database Schema Types

The `server/db/types.ts` file contains TypeScript type definitions for all database models:

- `InferSelectModel<>` types represent the shape of records retrieved from the database
- `InferInsertModel<>` types represent the shape of records being inserted into the database
- Extended interface types represent records with their relations

## Best Practices for Type Safety

### 1. Querying Data

When querying data, always add type assertions to maintain type safety:

```typescript
// BAD: This loses type information
const user = await db.query.users.findFirst({
  where: eq(users.username, username),
});

// GOOD: This maintains type safety
const user = await db.query.users.findFirst({
  where: eq(users.username, username),
}) as User | undefined;
```

### 2. Inserting Data

When inserting data, create properly typed objects:

```typescript
// BAD: Inline objects
await db.insert(users).values({
  username: userData.username,
  passwordHash,
  firstName: userData.firstName,
  lastName: userData.lastName,
  isAdmin: userData.isAdmin,
});

// GOOD: Type-checked objects
const userToInsert: NewUser = {
  username: userData.username,
  passwordHash,
  firstName: userData.firstName,
  lastName: userData.lastName,
  isAdmin: userData.isAdmin,
};

await db.insert(users).values(userToInsert);
```

### 3. Working with Relations

When querying related data, use appropriate interface types:

```typescript
// Create response object with properly typed data
const response: HouseholdWithMembers & { isOwner: boolean } = {
  ...household,
  members,
  isOwner: membership.isOwner,
};
```

### 4. Custom Query Results

When building complex queries with joins, use type assertions with detailed interface types:

```typescript
const members = await db
  .select({
    id: users.id,
    username: users.username,
    firstName: users.firstName,
    lastName: users.lastName,
    isOwner: householdMembers.isOwner,
  })
  .from(users)
  .innerJoin(/* ... */) as (Pick<User, 'id' | 'username' | 'firstName' | 'lastName'> & { isOwner: boolean })[];
```

### 5. Adding New Database Tables

When adding new tables to the schema:

1. Define the table in `server/db/schema.ts`
2. Add corresponding types in `server/db/types.ts` using `InferSelectModel` and `InferInsertModel`
3. Add any additional interface types for relations or extended data

## Middleware Type Safety

Middleware functions should include explicit return types:

```typescript
export async function authenticate(c: Context, next: () => Promise<void>): Promise<Response | void> {
  // Implementation...
}
```

## Utility Functions

Utility functions should have explicit parameter and return types:

```typescript
export function verifyToken(token: string): JwtUser | null {
  // Implementation...
}
```

## Benefits

Maintaining type safety throughout the application provides several benefits:

- Early error detection during development
- Better IDE support with autocomplete and refactoring tools
- Self-documenting code that's easier to understand
- Fewer runtime errors in production
- Easier maintenance and refactoring

By following these guidelines, we can ensure that our application remains type-safe as it evolves.
