# Shared Types System

This document explains how the shared type system works in the Family Task Manager application, providing a single source of truth for types between frontend and backend.

## Overview

In a full-stack TypeScript application, type definitions often need to be duplicated between frontend and backend code. This leads to:

- **Inconsistencies**: Types can drift apart over time
- **Maintenance burden**: Changes must be made in multiple places
- **Developer confusion**: "Which version of this type is correct?"

Our solution provides a single source of truth for all types that represent the API contract between client and server.

## Architecture

The shared type system consists of:

### 1. Shared Type Definitions (`/shared/types.ts`)

Contains all interface definitions that represent:
- API request and response shapes
- Domain entities (User, Household, Task, etc.)
- API response wrappers

These types define the _contract_ between frontend and backend.

### 2. Backend Database Models (`/server/db/types.ts`)

Contains:
- Database model types (using Drizzle's `InferSelectModel` and `InferInsertModel`)
- Mapping functions to convert between database models and API types
- Helper functions to convert API requests to database insert operations

### 3. Frontend API Service (`/src/services/api.ts`)

- Uses shared types for API requests and responses
- Provides type-safe methods for interacting with the backend

## Type Flow

1. **Database → API**: Database models are mapped to API types before being sent to the client
2. **API → Database**: API request types are converted to database models before storage
3. **Frontend → Backend**: Request and response types match perfectly on both sides

## Benefits

- **Single Source of Truth**: Make a change to a type in one place only
- **Automatic Propagation**: Changes to types are immediately reflected across the codebase
- **Type Safety**: Full type safety from database to UI
- **IDE Support**: Better autocomplete and type hints across the entire application
- **Documentation**: Types serve as self-documenting contracts for the API

## Usage Guidelines

### Adding a New Entity

1. First, define the entity in the shared types file:
   ```typescript
   // in shared/types.ts
   export interface NewEntity {
     id: number;
     name: string;
     // other properties
   }

   export interface CreateNewEntityRequest {
     name: string;
     // other properties needed for creation
   }
   ```

2. Add corresponding database model types:
   ```typescript
   // in server/db/types.ts
   export type NewEntityModel = InferSelectModel<typeof newEntities>;
   export type NewNewEntity = InferInsertModel<typeof newEntities>;

   // Re-export the shared type
   export type NewEntity = SharedTypes.NewEntity;

   // Add mapping function
   export function mapNewEntityModelToNewEntity(model: NewEntityModel): NewEntity {
     return {
       id: model.id,
       name: model.name,
       // map other properties
     };
   }
   ```

3. Update the frontend API service:
   ```typescript
   // in src/services/api.ts
   newEntities: {
     getAll: async (): Promise<NewEntity[]> => {
       const response = await axios.get<{ entities: NewEntity[] }>('/new-entities');
       return response.data.entities;
     },
   }
   ```

### Updating Existing Types

When you need to update a type:

1. First, update it in `shared/types.ts`
2. If needed, update the mapping functions in `server/db/types.ts`
3. Check if any backend code needs updating to match the new type
4. Check if any frontend code needs updating to match the new type

## Example: User Authentication

Here's how the type flow works for the login process:

1. **Shared Request/Response Types**:
   ```typescript
   // in shared/types.ts
   export interface AuthResponse {
     token: string;
     user: User;
   }
   ```

2. **Backend Type Conversion**:
   ```typescript
   // in server routes
   const userModel = await db.query.users.findFirst({...}) as UserModel;
   const user = mapUserModelToUser(userModel);

   const response: AuthResponse = {
     token,
     user,
   };
   ```

3. **Frontend Type Safety**:
   ```typescript
   // in frontend services
   login: async (username: string, password: string): Promise<AuthResponse> => {
     const response = await axios.post<AuthResponse>('/auth/login', { username, password });
     return response.data;
   }
   ```

## Troubleshooting

If you encounter type errors:

1. **Check import paths**: Ensure you're importing from the shared types
2. **Verify mapping functions**: Make sure all properties are being mapped correctly
3. **TypeScript paths**: Check tsconfig.json to ensure path aliases are working

## Conclusion

This shared type system helps maintain consistency between frontend and backend, reduces code duplication, and provides a more robust development experience. By using this approach, we create a strong contract between our API layers that helps catch errors at compile time rather than runtime.
