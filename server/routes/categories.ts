import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";
import { db } from "../db";
import { categories, householdMembers, templateTasks } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import {
  createDatabaseQueryError,
  createRecordNotFoundError,
  createInvalidInputError,
  createInsufficientPermissionsError,
  type AppResult,
} from "../utils/result";
import { ok, err } from "neverthrow";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { categorySchema } from "@shared/schemas";
import { typedJson, type TypedResponse, safeParse } from "./helpers";

const categoryRoutes = new Hono();

// Apply authentication to all routes
categoryRoutes.use("*", authenticate);

/**
 * Check if a user is a member of a household
 */
async function verifyHouseholdMembership(
  userId: number,
  householdId: number,
): Promise<AppResult<boolean>> {
  try {
    const membership = await db.query.householdMembers.findFirst({
      where: and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, householdId),
      ),
    });

    if (!membership) {
      return err(createInsufficientPermissionsError("Household not found or access denied"));
    }

    return ok(true);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to verify household membership", error));
  }
}

/**
 * Get a category by ID
 */
async function getCategoryById(
  categoryId: number,
): Promise<AppResult<typeof categories.$inferSelect>> {
  try {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });

    if (!category) {
      return err(createRecordNotFoundError("Category not found"));
    }

    return ok(category);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to get category", error));
  }
}

/**
 * Get all categories for a household
 */
async function getHouseholdCategories(
  householdId: number,
): Promise<AppResult<(typeof categories.$inferSelect)[]>> {
  try {
    const householdCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.householdId, householdId));

    return ok(householdCategories);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch categories", error));
  }
}

/**
 * Create a new category
 */
async function createCategory(
  name: string,
  description: string | undefined,
  householdId: number,
): Promise<AppResult<typeof categories.$inferSelect>> {
  try {
    const [newCategory] = await db
      .insert(categories)
      .values({
        name,
        description,
        householdId,
      })
      .returning();
    if (newCategory === undefined) {
      return err(createDatabaseQueryError("Failed to create category"));
    }

    return ok(newCategory);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to create category", error));
  }
}

/**
 * Update a category
 */
async function updateCategory(
  categoryId: number,
  name: string,
  description: string | undefined,
): Promise<AppResult<typeof categories.$inferSelect>> {
  try {
    const [updatedCategory] = await db
      .update(categories)
      .set({
        name,
        description,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId))
      .returning();
    if (updatedCategory === undefined) {
      return err(createDatabaseQueryError("Failed to update category"));
    }

    return ok(updatedCategory);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to update category", error));
  }
}

/**
 * Check if a category has any associated tasks
 */
async function checkCategoryHasTasks(categoryId: number): Promise<AppResult<boolean>> {
  try {
    const referencedTasks = await db.query.templateTasks.findFirst({
      where: eq(templateTasks.categoryId, categoryId),
    });

    return ok(!!referencedTasks);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to check if category has tasks", error));
  }
}

/**
 * Delete a category
 */
async function deleteCategory(categoryId: number): Promise<AppResult<boolean>> {
  try {
    await db.delete(categories).where(eq(categories.id, categoryId));
    return ok(true);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to delete category", error));
  }
}

// Here are all th endpoint handlers
// ----------------------------------------------------------------------------------------

categoryRoutes.get(
  "/household/:householdId",
  async (c): Promise<TypedResponse<z.infer<typeof categorySchema>[]>> => {
    const user = c.get("user");
    const householdId = Number.parseInt(c.req.param("householdId"));

    if (Number.isNaN(householdId)) {
      const error = createInvalidInputError("Invalid household ID");
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 400) as ContentfulStatusCode,
      );
    }

    // Verify user is a member of this household
    const membershipResult = await verifyHouseholdMembership(user.id, householdId);

    if (membershipResult.isErr()) {
      const error = membershipResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 403) as ContentfulStatusCode,
      );
    }

    // Get categories for this household
    const categoriesResult = await getHouseholdCategories(householdId);

    if (categoriesResult.isErr()) {
      const error = categoriesResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 500) as ContentfulStatusCode,
      );
    }

    const output = categoriesResult.value.map((r) => safeParse(categorySchema, r));
    return typedJson(c, output, 200);
  },
);

// Create a new category
categoryRoutes.post(
  "/",
  zValidator("json", categorySchema),
  async (c): Promise<TypedResponse<z.infer<typeof categorySchema>>> => {
    const user = c.get("user");
    const { name, description, householdId } = await c.req.valid("json");

    // Verify user is a member of this household
    const membershipResult = await verifyHouseholdMembership(user.id, householdId);

    if (membershipResult.isErr()) {
      const error = membershipResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 403) as ContentfulStatusCode,
      );
    }

    // Create the category
    const categoryResult = await createCategory(name, description ?? undefined, householdId);

    if (categoryResult.isErr()) {
      const error = categoryResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 500) as ContentfulStatusCode,
      );
    }

    return typedJson(c, safeParse(categorySchema, categoryResult.value), 201);
  },
);

// Update a category
categoryRoutes.put(
  "/:id",
  zValidator("json", categorySchema.omit({ householdId: true })),
  async (c): Promise<TypedResponse<z.infer<typeof categorySchema>>> => {
    const user = c.get("user");
    const categoryId = Number.parseInt(c.req.param("id"));
    const { name, description } = await c.req.valid("json");

    if (Number.isNaN(categoryId)) {
      const error = createInvalidInputError("Invalid category ID");
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 400) as ContentfulStatusCode,
      );
    }

    // Get the category
    const categoryResult = await getCategoryById(categoryId);

    if (categoryResult.isErr()) {
      const error = categoryResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 404) as ContentfulStatusCode,
      );
    }

    const category = categoryResult.value;

    // Verify user is a member of this household
    const membershipResult = await verifyHouseholdMembership(user.id, category.householdId);

    if (membershipResult.isErr()) {
      const error = membershipResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 403) as ContentfulStatusCode,
      );
    }

    // Update the category
    const updateResult = await updateCategory(categoryId, name, description ?? undefined);

    if (updateResult.isErr()) {
      const error = updateResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 500) as ContentfulStatusCode,
      );
    }

    return typedJson(c, safeParse(categorySchema, updateResult.value), 200);
  },
);

// Delete a category
categoryRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const categoryId = Number.parseInt(c.req.param("id"));

  if (Number.isNaN(categoryId)) {
    const error = createInvalidInputError("Invalid category ID");
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Get the category
  const categoryResult = await getCategoryById(categoryId);

  if (categoryResult.isErr()) {
    const error = categoryResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 404) as ContentfulStatusCode,
    );
  }

  const category = categoryResult.value;

  // Verify user is a member of this household
  const membershipResult = await verifyHouseholdMembership(user.id, category.householdId);

  if (membershipResult.isErr()) {
    const error = membershipResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 403) as ContentfulStatusCode,
    );
  }

  // Check if this category has any tasks
  const hasTasksResult = await checkCategoryHasTasks(categoryId);

  if (hasTasksResult.isErr()) {
    const error = hasTasksResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  if (hasTasksResult.value) {
    const error = createInvalidInputError(
      "Cannot delete this category because it has tasks associated with it. Please reassign or delete those tasks first.",
    );
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Delete the category
  const deleteResult = await deleteCategory(categoryId);

  if (deleteResult.isErr()) {
    const error = deleteResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  return c.json({ message: "Category deleted successfully" });
});

export default categoryRoutes;
