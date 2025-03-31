import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import {
  templates,
  templateTasks,
  templateTaskAssignments,
  categories,
  householdMembers,
  users,
} from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import {
  createDatabaseQueryError,
  createRecordNotFoundError,
  createInvalidInputError,
  createInsufficientPermissionsError,
  type AppResult,
  ok,
  err,
} from "../utils/result";
import { createTemplateSchema, createTemplateTaskSchema } from "@shared/schemas";

// Define interfaces for return types to avoid 'any'
interface TemplateTaskWithCategory {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  timesPerMonth: number;
  storyPoints: number;
  assignToAll: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskAssignment {
  taskId: number;
  userId: number;
  firstName: string;
  lastName: string;
}

interface HouseholdMember {
  id: number;
  firstName: string;
  lastName: string;
}

const templateRoutes = new Hono();

// Apply authentication to all routes
templateRoutes.use("*", authenticate);

/**
 * Verify a user is a member of a household
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
 * Get a template by ID
 */
async function getTemplateById(
  templateId: number,
): Promise<AppResult<typeof templates.$inferSelect>> {
  try {
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });

    if (!template) {
      return err(createRecordNotFoundError("Template not found"));
    }

    return ok(template);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to get template", error));
  }
}

/**
 * Get a template task by ID
 */
async function getTemplateTaskById(
  taskId: number,
): Promise<AppResult<typeof templateTasks.$inferSelect>> {
  try {
    const task = await db.query.templateTasks.findFirst({
      where: eq(templateTasks.id, taskId),
    });

    if (!task) {
      return err(createRecordNotFoundError("Task not found"));
    }

    return ok(task);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to get template task", error));
  }
}

/**
 * Verify a category belongs to a household
 */
async function verifyCategoryInHousehold(
  categoryId: number,
  householdId: number,
): Promise<AppResult<typeof categories.$inferSelect>> {
  try {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, categoryId), eq(categories.householdId, householdId)),
    });

    if (!category) {
      return err(createInvalidInputError("Category not found or doesn't belong to this household"));
    }

    return ok(category);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to verify category ownership", error));
  }
}

/**
 * Get templates for a household
 */
async function getHouseholdTemplates(
  householdId: number,
): Promise<AppResult<(typeof templates.$inferSelect)[]>> {
  try {
    const householdTemplates = await db
      .select()
      .from(templates)
      .where(eq(templates.householdId, householdId));

    return ok(householdTemplates);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch templates", error));
  }
}

/**
 * Create a new template
 */
async function createTemplate(
  name: string,
  description: string | undefined,
  householdId: number,
): Promise<AppResult<typeof templates.$inferSelect>> {
  try {
    const [newTemplate] = await db
      .insert(templates)
      .values({
        name,
        description,
        householdId,
      })
      .returning();
    if (newTemplate === undefined) {
      return err(createDatabaseQueryError("Failed to create template"));
    }

    return ok(newTemplate);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to create template", error));
  }
}

/**
 * Get template tasks with category info
 */
async function getTemplateTasks(
  templateId: number,
): Promise<AppResult<TemplateTaskWithCategory[]>> {
  try {
    const tasks = await db
      .select({
        id: templateTasks.id,
        name: templateTasks.name,
        description: templateTasks.description,
        categoryId: templateTasks.categoryId,
        categoryName: categories.name,
        timesPerMonth: templateTasks.timesPerMonth,
        storyPoints: templateTasks.storyPoints,
        assignToAll: templateTasks.assignToAll,
        createdAt: templateTasks.createdAt,
        updatedAt: templateTasks.updatedAt,
      })
      .from(templateTasks)
      .leftJoin(categories, eq(templateTasks.categoryId, categories.id))
      .where(eq(templateTasks.templateId, templateId));

    // Ensure categoryName is never null
    const tasksWithNonNullCategoryName = tasks.map((task) => ({
      ...task,
      categoryName: task.categoryName || "Uncategorized",
    }));

    return ok(tasksWithNonNullCategoryName);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch template tasks", error));
  }
}

/**
 * Get task assignments with user info
 */
async function getTaskAssignments(taskIds: number[]): Promise<AppResult<TaskAssignment[]>> {
  if (taskIds.length === 0) {
    return ok([]);
  }

  try {
    const assignments = await db
      .select({
        taskId: templateTaskAssignments.templateTaskId,
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(templateTaskAssignments)
      .innerJoin(users, eq(templateTaskAssignments.userId, users.id))
      .where(inArray(templateTaskAssignments.templateTaskId, taskIds));

    return ok(assignments);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch task assignments", error));
  }
}

/**
 * Get household categories
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
    return err(createDatabaseQueryError("Failed to fetch household categories", error));
  }
}

/**
 * Get household members
 */
async function getHouseholdMembers(householdId: number): Promise<AppResult<HouseholdMember[]>> {
  try {
    const householdMembersList = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .innerJoin(
        householdMembers,
        and(eq(householdMembers.userId, users.id), eq(householdMembers.householdId, householdId)),
      );

    return ok(householdMembersList);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch household members", error));
  }
}

/**
 * Create a template task
 */
async function createTemplateTask(
  templateId: number,
  categoryId: number,
  name: string,
  description: string | undefined,
  timesPerMonth: number,
  storyPoints: number,
  assignToAll: boolean,
): Promise<AppResult<typeof templateTasks.$inferSelect>> {
  try {
    const [newTask] = await db
      .insert(templateTasks)
      .values({
        templateId,
        categoryId,
        name,
        description,
        timesPerMonth,
        storyPoints,
        assignToAll,
      })
      .returning();

    if (newTask === undefined) {
      return err(createDatabaseQueryError("Failed to create template task"));
    }
    return ok(newTask);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to create template task", error));
  }
}

/**
 * Get household member IDs
 */
async function getHouseholdMemberIds(householdId: number): Promise<AppResult<number[]>> {
  try {
    const householdMemberIds = await db
      .select({ userId: householdMembers.userId })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, householdId));

    return ok(householdMemberIds.map((m) => m.userId));
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch household member IDs", error));
  }
}

/**
 * Create task assignments
 */
async function createTaskAssignments(
  taskId: number,
  userIds: number[],
): Promise<AppResult<boolean>> {
  if (userIds.length === 0) {
    return ok(true);
  }

  try {
    await db.insert(templateTaskAssignments).values(
      userIds.map((userId) => ({
        templateTaskId: taskId,
        userId,
      })),
    );

    return ok(true);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to create task assignments", error));
  }
}

/**
 * Update a template task
 */
async function updateTemplateTask(
  taskId: number,
  name: string,
  description: string | undefined,
  categoryId: number,
  timesPerMonth: number,
  storyPoints: number,
  assignToAll: boolean,
): Promise<AppResult<typeof templateTasks.$inferSelect>> {
  try {
    const [updatedTask] = await db
      .update(templateTasks)
      .set({
        name,
        description,
        categoryId,
        timesPerMonth,
        storyPoints,
        assignToAll,
        updatedAt: new Date(),
      })
      .where(eq(templateTasks.id, taskId))
      .returning();
    if (updatedTask === undefined) {
      return err(createDatabaseQueryError("Failed to update template task"));
    }

    return ok(updatedTask);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to update template task", error));
  }
}

/**
 * Delete task assignments
 */
async function deleteTaskAssignments(taskId: number): Promise<AppResult<boolean>> {
  try {
    await db
      .delete(templateTaskAssignments)
      .where(eq(templateTaskAssignments.templateTaskId, taskId));

    return ok(true);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to delete task assignments", error));
  }
}

/**
 * Delete a template task
 */
async function deleteTemplateTask(taskId: number): Promise<AppResult<boolean>> {
  try {
    await db.delete(templateTasks).where(eq(templateTasks.id, taskId));
    return ok(true);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to delete template task", error));
  }
}

// Get templates for a household
templateRoutes.get("/household/:householdId", async (c) => {
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

  // Get templates for this household
  const templatesResult = await getHouseholdTemplates(householdId);

  if (templatesResult.isErr()) {
    const error = templatesResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  return c.json({ templates: templatesResult.value });
});

// Create a new template
templateRoutes.post("/", zValidator("json", createTemplateSchema), async (c) => {
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

  // Create the template
  const templateResult = await createTemplate(name, description ?? undefined, householdId);

  if (templateResult.isErr()) {
    const error = templateResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  return c.json({ template: templateResult.value }, 201);
});

// Get a specific template with its tasks
templateRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const templateId = Number.parseInt(c.req.param("id"));

  if (Number.isNaN(templateId)) {
    const error = createInvalidInputError("Invalid template ID");
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Get the template
  const templateResult = await getTemplateById(templateId);

  if (templateResult.isErr()) {
    const error = templateResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 404) as ContentfulStatusCode,
    );
  }

  const template = templateResult.value;

  // Verify user is a member of this household
  const membershipResult = await verifyHouseholdMembership(user.id, template.householdId);

  if (membershipResult.isErr()) {
    const error = membershipResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 403) as ContentfulStatusCode,
    );
  }

  // Get template tasks
  const tasksResult = await getTemplateTasks(templateId);

  if (tasksResult.isErr()) {
    const error = tasksResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  const tasks = tasksResult.value;

  // Get task assignments
  const templateTaskIds = tasks.map((task) => task.id);

  const assignmentsResult = await getTaskAssignments(templateTaskIds);

  if (assignmentsResult.isErr()) {
    const error = assignmentsResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  const assignments = assignmentsResult.value;

  // Group assignments by task
  const assignmentsByTask = assignments.reduce(
    (acc, curr) => {
      if (!acc[curr.taskId]) {
        acc[curr.taskId] = [];
      }
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      acc[curr.taskId]!.push({
        userId: curr.userId,
        firstName: curr.firstName,
        lastName: curr.lastName,
      });
      return acc;
    },
    {} as Record<number, { userId: number; firstName: string; lastName: string }[]>,
  );

  // Add assignments to tasks
  const tasksWithAssignments = tasks.map((task) => ({
    ...task,
    assignedUsers: assignmentsByTask[task.id] || [],
  }));

  // Get household categories for reference
  const categoriesResult = await getHouseholdCategories(template.householdId);

  if (categoriesResult.isErr()) {
    const error = categoriesResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  // Get household members for reference
  const membersResult = await getHouseholdMembers(template.householdId);

  if (membersResult.isErr()) {
    const error = membersResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  return c.json({
    template,
    tasks: tasksWithAssignments,
    categories: categoriesResult.value,
    members: membersResult.value,
  });
});

// Add a task to a template
templateRoutes.post("/:id/tasks", zValidator("json", createTemplateTaskSchema), async (c) => {
  const user = c.get("user");
  const templateId = Number.parseInt(c.req.param("id"));
  const {
    name,
    description,
    categoryId,
    timesPerMonth,
    storyPoints,
    assignToAll,
    assignedUserIds = [],
  } = await c.req.valid("json");

  if (Number.isNaN(templateId)) {
    const error = createInvalidInputError("Invalid template ID");
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Get the template
  const templateResult = await getTemplateById(templateId);

  if (templateResult.isErr()) {
    const error = templateResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 404) as ContentfulStatusCode,
    );
  }

  const template = templateResult.value;

  // Verify user is a member of this household
  const membershipResult = await verifyHouseholdMembership(user.id, template.householdId);

  if (membershipResult.isErr()) {
    const error = membershipResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 403) as ContentfulStatusCode,
    );
  }

  // Verify the category belongs to this household
  const categoryResult = await verifyCategoryInHousehold(categoryId, template.householdId);

  if (categoryResult.isErr()) {
    const error = categoryResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  const category = categoryResult.value;

  // Create the template task
  const taskResult = await createTemplateTask(
    templateId,
    categoryId,
    name,
    description,
    timesPerMonth,
    storyPoints,
    assignToAll,
  );

  if (taskResult.isErr()) {
    const error = taskResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  const newTask = taskResult.value;

  // If not assigned to all, create assignments for specific users
  if (!assignToAll && assignedUserIds.length > 0) {
    // Verify all users are household members
    const memberIdsResult = await getHouseholdMemberIds(template.householdId);

    if (memberIdsResult.isErr()) {
      const error = memberIdsResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 500) as ContentfulStatusCode,
      );
    }

    const validMemberIds = new Set(memberIdsResult.value);
    const validAssignees = assignedUserIds.filter((id) => validMemberIds.has(id));

    // Create assignments
    if (validAssignees.length > 0) {
      const assignmentsResult = await createTaskAssignments(newTask.id, validAssignees);

      if (assignmentsResult.isErr()) {
        const error = assignmentsResult.error;
        return c.json(
          { message: error.message, type: error.type },
          (error.statusCode || 500) as ContentfulStatusCode,
        );
      }
    }
  }

  // Get category info for the response
  const taskWithCategory = {
    ...newTask,
    categoryName: category.name,
  };

  return c.json({ task: taskWithCategory }, 201);
});

// Update a template task
templateRoutes.put("/tasks/:taskId", zValidator("json", createTemplateTaskSchema), async (c) => {
  const user = c.get("user");
  const taskId = Number.parseInt(c.req.param("taskId"));
  const {
    name,
    description,
    categoryId,
    timesPerMonth,
    storyPoints,
    assignToAll,
    assignedUserIds = [],
  } = await c.req.valid("json");

  if (Number.isNaN(taskId)) {
    const error = createInvalidInputError("Invalid task ID");
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Get the task
  const taskResult = await getTemplateTaskById(taskId);

  if (taskResult.isErr()) {
    const error = taskResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 404) as ContentfulStatusCode,
    );
  }

  const task = taskResult.value;

  // Get the template
  const templateResult = await getTemplateById(task.templateId);

  if (templateResult.isErr()) {
    const error = templateResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 404) as ContentfulStatusCode,
    );
  }

  const template = templateResult.value;

  // Verify user is a member of this household
  const membershipResult = await verifyHouseholdMembership(user.id, template.householdId);

  if (membershipResult.isErr()) {
    const error = membershipResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 403) as ContentfulStatusCode,
    );
  }

  // Verify the category belongs to this household
  const categoryResult = await verifyCategoryInHousehold(categoryId, template.householdId);

  if (categoryResult.isErr()) {
    const error = categoryResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  const category = categoryResult.value;

  // Update the task
  const updateResult = await updateTemplateTask(
    taskId,
    name,
    description,
    categoryId,
    timesPerMonth,
    storyPoints,
    assignToAll,
  );

  if (updateResult.isErr()) {
    const error = updateResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  const updatedTask = updateResult.value;

  // Delete existing assignments
  const deleteResult = await deleteTaskAssignments(taskId);

  if (deleteResult.isErr()) {
    const error = deleteResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  // If not assigned to all, create new assignments for specific users
  if (!assignToAll && assignedUserIds.length > 0) {
    // Verify all users are household members
    const memberIdsResult = await getHouseholdMemberIds(template.householdId);

    if (memberIdsResult.isErr()) {
      const error = memberIdsResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 500) as ContentfulStatusCode,
      );
    }

    const validMemberIds = new Set(memberIdsResult.value);
    const validAssignees = assignedUserIds.filter((id) => validMemberIds.has(id));

    // Create assignments
    if (validAssignees.length > 0) {
      const assignmentsResult = await createTaskAssignments(updatedTask.id, validAssignees);

      if (assignmentsResult.isErr()) {
        const error = assignmentsResult.error;
        return c.json(
          { message: error.message, type: error.type },
          (error.statusCode || 500) as ContentfulStatusCode,
        );
      }
    }
  }

  return c.json({
    task: {
      ...updatedTask,
      categoryName: category.name,
    },
  });
});

// Delete a template task
templateRoutes.delete("/tasks/:taskId", async (c) => {
  const user = c.get("user");
  const taskId = Number.parseInt(c.req.param("taskId"));

  if (Number.isNaN(taskId)) {
    const error = createInvalidInputError("Invalid task ID");
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Get the task
  const taskResult = await getTemplateTaskById(taskId);

  if (taskResult.isErr()) {
    const error = taskResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 404) as ContentfulStatusCode,
    );
  }

  const task = taskResult.value;

  // Get the template
  const templateResult = await getTemplateById(task.templateId);

  if (templateResult.isErr()) {
    const error = templateResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 404) as ContentfulStatusCode,
    );
  }

  const template = templateResult.value;

  // Verify user is a member of this household
  const membershipResult = await verifyHouseholdMembership(user.id, template.householdId);

  if (membershipResult.isErr()) {
    const error = membershipResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 403) as ContentfulStatusCode,
    );
  }

  // Delete the task (assignments will cascade)
  const deleteResult = await deleteTemplateTask(taskId);

  if (deleteResult.isErr()) {
    const error = deleteResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  return c.json({ message: "Task deleted successfully" });
});

export default templateRoutes;
