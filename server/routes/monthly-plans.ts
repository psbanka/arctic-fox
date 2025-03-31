/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import {
  monthlyPlans,
  tasks,
  categories,
  householdMembers,
  users,
  templateTasks,
  templateTaskAssignments,
  taskAssignments,
} from "../db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { ok, err, type AppResult } from "../utils/result";
import { authenticate } from "../middleware/auth";
import {
  createDatabaseQueryError,
  createRecordNotFoundError,
  createInvalidInputError,
} from "../utils/result";
import type { Task, Category, PlanStats } from "@shared/types";
import { verifyHouseholdMembership } from "../utils/household";
import { mapMonthlyPlanModelToMonthlyPlan } from "../db/types";
import { createMonthlyPlanSchema, completeTaskSchema, createTaskSchema, taskSchema } from "@shared/schemas";

const monthlyPlanRoutes = new Hono();

// Apply authentication to all routes
monthlyPlanRoutes.use("*", authenticate);

// Define interfaces for the return types to replace 'any'
interface TemplateTaskWithAssignments {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  storyPoints: number;
  assignToAll: boolean;
  assignedUserIds: number[];
  timesPerMonth: number;
}

interface PlanTaskWithCategory {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string | null;
  storyPoints: number;
  isTemplateTask: boolean;
  isCompleted: boolean;
  completedAt: Date | null;
  completedBy: number | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskAssignment {
  taskId: number;
  userId: number;
  firstName: string;
  lastName: string;
}

interface PlanStatistics {
  totalTasks: number;
  completedTasks: number;
  tasksCompletionPercentage: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  storyPointsCompletionPercentage: number;
}

/**
 * Get monthly plans for a household
 */
async function getHouseholdPlans(householdId: number): Promise<AppResult<typeof monthlyPlans.$inferSelect[]>> {
  try {
    const plans = await db
      .select()
      .from(monthlyPlans)
      .where(eq(monthlyPlans.householdId, householdId))
      .orderBy(desc(monthlyPlans.year), desc(monthlyPlans.month));

    return ok(plans);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch monthly plans", error));
  }
}

/**
 * Get a monthly plan by ID
 */
async function getPlanById(planId: number): Promise<AppResult<typeof monthlyPlans.$inferSelect>> {
  try {
    const plan = await db.query.monthlyPlans.findFirst({
      where: eq(monthlyPlans.id, planId),
    });

    if (!plan) {
      return err(createRecordNotFoundError("Plan not found"));
    }

    return ok(plan);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to get plan", error));
  }
}

/**
 * Check if a plan exists for a specific month and year
 */
async function checkPlanExists(householdId: number, month: number, year: number): Promise<AppResult<boolean>> {
  try {
    const existingPlan = await db.query.monthlyPlans.findFirst({
      where: and(
        eq(monthlyPlans.householdId, householdId),
        eq(monthlyPlans.month, month),
        eq(monthlyPlans.year, year),
      ),
    });

    return ok(!!existingPlan);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to check if plan exists", error));
  }
}

/**
 * Create a new monthly plan
 */
async function createMonthlyPlan(
  householdId: number,
  month: number,
  year: number,
  name: string
): Promise<AppResult<typeof monthlyPlans.$inferSelect>> {
  try {
    const [newPlan] = await db
      .insert(monthlyPlans)
      .values({
        householdId,
        month,
        year,
        name,
        isClosed: false,
      })
      .returning();

    if (newPlan === undefined) {
      return err(createDatabaseQueryError("Failed to create monthly plan"));
    }
    return ok(newPlan);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to create monthly plan", error));
  }
}

/**
 * Get household categories
 */
async function getHouseholdCategories(householdId: number): Promise<AppResult<typeof categories.$inferSelect[]>> {
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
 * Get tasks for a plan with category info
 */
async function getPlanTasks(planId: number): Promise<AppResult<PlanTaskWithCategory[]>> {
  try {
    const tasksList = await db
      .select({
        id: tasks.id,
        name: tasks.name,
        description: tasks.description,
        categoryId: tasks.categoryId,
        categoryName: categories.name,
        storyPoints: tasks.storyPoints,
        isTemplateTask: tasks.isTemplateTask,
        isCompleted: tasks.isCompleted,
        completedAt: tasks.completedAt,
        completedBy: tasks.completedBy,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(
        categories,
        eq(tasks.categoryId, categories.id),
      )
      .where(eq(tasks.monthlyPlanId, planId));

    return ok(tasksList.map(task => ({
      ...task,
      categoryName: task.categoryName || 'Uncategorized'
    })));
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch plan tasks", error));
  }
}

/**
 * Get template tasks with their assignments
 */
async function getTemplateTasksWithAssignments(templateId: number): Promise<AppResult<TemplateTaskWithAssignments[]>> {
  try {
    // Get template tasks
    const templateTasksList = await db
      .select({
        id: templateTasks.id,
        name: templateTasks.name,
        description: templateTasks.description,
        categoryId: templateTasks.categoryId,
        storyPoints: templateTasks.storyPoints,
        assignToAll: templateTasks.assignToAll,
        timesPerMonth: templateTasks.timesPerMonth,
      })
      .from(templateTasks)
      .where(eq(templateTasks.templateId, templateId));

    if (templateTasksList.length === 0) {
      return ok([]);
    }

    // Get task assignments
    const taskIds = templateTasksList.map(task => task.id);
    const assignments = await db
      .select({
        taskId: templateTaskAssignments.templateTaskId,
        userId: templateTaskAssignments.userId,
      })
      .from(templateTaskAssignments)
      .where(inArray(templateTaskAssignments.templateTaskId, taskIds));

    // Group assignments by task
    const assignmentsByTask = assignments.reduce((acc, curr) => {
      if (!acc[curr.taskId]) {
        acc[curr.taskId] = [];
      }
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      acc[curr.taskId]!.push(curr.userId);
      return acc;
    }, {} as Record<number, number[]>);

    // Add assignments to tasks
    const tasksWithAssignments = templateTasksList.map(task => ({
      ...task,
      assignedUserIds: assignmentsByTask[task.id] || [],
    }));

    return ok(tasksWithAssignments);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch template tasks with assignments", error));
  }
}

/**
 * Get all household members
 */
async function getHouseholdMemberIds(householdId: number): Promise<AppResult<number[]>> {
  try {
    const members = await db
      .select({
        userId: householdMembers.userId,
      })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, householdId));

    return ok(members.map(m => m.userId));
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch household members", error));
  }
}

/**
 * Create a task from a template task
 */
async function createTaskFromTemplate(
  templateTask: TemplateTaskWithAssignments,
  monthlyPlanId: number
): Promise<AppResult<typeof tasks.$inferSelect>> {
  try {
    const [newTask] = await db
      .insert(tasks)
      .values({
        monthlyPlanId,
        templateTaskId: templateTask.id,
        categoryId: templateTask.categoryId,
        name: templateTask.name,
        description: templateTask.description,
        storyPoints: templateTask.storyPoints,
        isTemplateTask: true,
      })
      .returning();
    if (newTask === undefined) {
      return err(createDatabaseQueryError("Failed to create task from template"));
    }

    return ok(newTask);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to create task from template", error));
  }
}

/**
 * Create task assignments
 */
async function createTaskAssignments(
  taskId: number,
  userIds: number[]
): Promise<AppResult<boolean>> {
  if (userIds.length === 0) {
    return ok(true);
  }

  try {
    await db.insert(taskAssignments).values(
      userIds.map(userId => ({
        taskId,
        userId,
      }))
    );

    return ok(true);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to create task assignments", error));
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
        taskId: taskAssignments.taskId,
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(taskAssignments)
      .innerJoin(
        users,
        eq(taskAssignments.userId, users.id),
      )
      .where(inArray(taskAssignments.taskId, taskIds));

    return ok(assignments);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch task assignments", error));
  }
}

/**
 * Get plan statistics
 */
async function getPlanStatistics(planId: number): Promise<AppResult<PlanStatistics>> {
  try {
    const tasksList = await db
      .select({
        id: tasks.id,
        storyPoints: tasks.storyPoints,
        isCompleted: tasks.isCompleted,
      })
      .from(tasks)
      .where(eq(tasks.monthlyPlanId, planId));

    const totalTasks = tasksList.length;
    const completedTasks = tasksList.filter(t => t.isCompleted).length;
    const totalStoryPoints = tasksList.reduce((sum, task) => sum + task.storyPoints, 0);
    const completedStoryPoints = tasksList
      .filter(t => t.isCompleted)
      .reduce((sum, task) => sum + task.storyPoints, 0);

    return ok({
      totalTasks,
      completedTasks,
      tasksCompletionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalStoryPoints,
      completedStoryPoints,
      storyPointsCompletionPercentage: totalStoryPoints > 0 ? Math.round((completedStoryPoints / totalStoryPoints) * 100) : 0,
    });
  } catch (error) {
    return err(createDatabaseQueryError("Failed to calculate plan statistics", error));
  }
}

/**
 * Get a task with its category name and assignments
 */
async function getTaskWithCategoryNameAndAssignments(taskId: number): Promise<AppResult<Task & { monthlyPlanId: number }>> {
  try {
    // Get the task with category name
    const [task] = await db
      .select({
        id: tasks.id,
        name: tasks.name,
        description: tasks.description,
        categoryId: tasks.categoryId,
        categoryName: categories.name,
        storyPoints: tasks.storyPoints,
        isTemplateTask: tasks.isTemplateTask,
        isCompleted: tasks.isCompleted,
        completedAt: tasks.completedAt,
        completedBy: tasks.completedBy,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        monthlyPlanId: tasks.monthlyPlanId,
      })
      .from(tasks)
      .leftJoin(
        categories,
        eq(tasks.categoryId, categories.id),
      )
      .where(eq(tasks.id, taskId));

    if (!task) {
      return err(createRecordNotFoundError("Task not found"));
    }

    // Get task assignments
    const assignmentsResult = await getTaskAssignments([taskId]);

    if (assignmentsResult.isErr()) {
      const error = assignmentsResult.error;
      return err(createDatabaseQueryError("Failed to fetch task assignments", error));
    }

    const assignments = assignmentsResult.value;

    // Group assignments by task
    const assignmentsByTask = assignments.reduce((acc, curr) => {
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
    }, {} as Record<number, { userId: number; firstName: string; lastName: string }[]>);

    // Add assignments to task and convert dates to ISO strings
    const taskWithAssignments: Task & { monthlyPlanId: number } = {
      ...task,
      categoryName: task.categoryName || 'Uncategorized',
      assignedUsers: assignmentsByTask[taskId] || [],
      completedAt: task.completedAt?.toISOString() || null,
      dueDate: task.dueDate?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };

    return ok(taskWithAssignments);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch task with category and assignments", error));
  }
}

// ------------------------------------------------------------------
// Here are the endpoint handlers
// ------------------------------------------------------------------

monthlyPlanRoutes.get("/household/:householdId", async (c) => {
  const user = c.get("user");
  const householdId = Number.parseInt(c.req.param("householdId"));

  if (Number.isNaN(householdId)) {
    const error = createInvalidInputError("Invalid household ID");
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 400) as ContentfulStatusCode);
  }

  // Verify user is a member of this household
  const membershipResult = await verifyHouseholdMembership(user.id, householdId);

  if (membershipResult.isErr()) {
    const error = membershipResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 403) as ContentfulStatusCode);
  }

  // Get monthly plans for this household
  const plansResult = await getHouseholdPlans(householdId);

  if (plansResult.isErr()) {
    const error = plansResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
  }

  return c.json({ plans: plansResult.value });
});

// Create a new monthly plan
monthlyPlanRoutes.post(
  "/",
  zValidator("json", createMonthlyPlanSchema),
  async (c) => {
    const user = c.get("user");
    const { householdId, month, year, name, templateId } = await c.req.valid("json");

    // Verify user is a member of this household
    const membershipResult = await verifyHouseholdMembership(user.id, householdId);

    if (membershipResult.isErr()) {
      const error = membershipResult.error;
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 403) as ContentfulStatusCode);
    }

    // Check if a plan for this month and year already exists
    const planExistsResult = await checkPlanExists(householdId, month, year);

    if (planExistsResult.isErr()) {
      const error = planExistsResult.error;
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
    }

    if (planExistsResult.value) {
      const error = createInvalidInputError("A plan for this month and year already exists");
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 400) as ContentfulStatusCode);
    }

    // Create the monthly plan
    const planResult = await createMonthlyPlan(householdId, month, year, name);

    if (planResult.isErr()) {
      const error = planResult.error;
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
    }

    const newPlan = planResult.value;

    // If a template ID is provided, add the template tasks to the monthly plan
    if (templateId) {
      // Get template tasks with assignments
      const templateTasksResult = await getTemplateTasksWithAssignments(templateId);

      if (templateTasksResult.isErr()) {
        const error = templateTasksResult.error;
        return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
      }

      const templateTasks = templateTasksResult.value;

      // Get household member IDs for tasks that should be assigned to all
      const memberIdsResult = await getHouseholdMemberIds(householdId);

      if (memberIdsResult.isErr()) {
        const error = memberIdsResult.error;
        return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
      }

      const allMemberIds = memberIdsResult.value;

      // Create tasks from template tasks
      for (const templateTask of templateTasks) {
        for (let i = 0; i < templateTask.timesPerMonth; i++) {
          const taskResult = await createTaskFromTemplate(templateTask, newPlan.id);

          if (taskResult.isErr()) {
            const error = taskResult.error;
            return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
          }

          const newTask = taskResult.value;

          // Create task assignments
          const assigneeIds = templateTask.assignToAll
            ? allMemberIds
            : templateTask.assignedUserIds;

          if (assigneeIds.length > 0) {
            const assignmentsResult = await createTaskAssignments(newTask.id, assigneeIds);

            if (assignmentsResult.isErr()) {
              const error = assignmentsResult.error;
              return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
            }
          }
        }
      }
    }

    return c.json({ plan: newPlan }, (201 as ContentfulStatusCode));
  },
);

type SimpleUser = { id: number; firstName: string; lastName: string };

// Get plan members
async function getPlanMembers(planId: number): Promise<AppResult<SimpleUser[]>> {
  const planResult = await getPlanById(planId);
  if (planResult.isErr()) {
    const error = planResult.error;
    // return c.json({ message: error.message, type: error.type }, (error.statusCode || 404) as ContentfulStatusCode);
    return err(error);
  }
  const plan = planResult.value;
  const memberIdResult = await getHouseholdMemberIds(plan.householdId);
  if (memberIdResult.isErr()) {
    const error = memberIdResult.error;
    return err(error);
  }
  try {
    const members = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(inArray(users.id, memberIdResult.value));

    return ok(members);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch plan members", error));
  }
}

// Get a specific monthly plan with its tasks
monthlyPlanRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const planId = Number.parseInt(c.req.param("id"));

  if (Number.isNaN(planId)) {
    const error = createInvalidInputError("Invalid plan ID");
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 400) as ContentfulStatusCode);
  }

  // Get the plan
  const planResult = await getPlanById(planId);

  if (planResult.isErr()) {
    const error = planResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 404) as ContentfulStatusCode);
  }

  const plan = planResult.value;

  // Verify user is a member of this household
  const membershipResult = await verifyHouseholdMembership(user.id, plan.householdId);

  if (membershipResult.isErr()) {
    const error = membershipResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 403) as ContentfulStatusCode);
  }

  // Get tasks for this plan
  const tasksResult = await getPlanTasks(planId);

  if (tasksResult.isErr()) {
    const error = tasksResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
  }

  const tasksList = tasksResult.value;

  // Get task assignments and stats
  const taskIds = tasksList.map(task => task.id);
  const assignmentsResult = await getTaskAssignments(taskIds);

  if (assignmentsResult.isErr()) {
    const error = assignmentsResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
  }

  const assignments = assignmentsResult.value;

  // Get members for this household
  const membersResult = await getPlanMembers(planId);

  if (membersResult.isErr()) {
    const error = membersResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
  }

  // Get categories for this household
  const categoriesResult = await getHouseholdCategories(plan.householdId);

  if (categoriesResult.isErr()) {
    const error = categoriesResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
  }

  // Get stats for this plan
  const statsResult = await getPlanStatistics(planId);

  if (statsResult.isErr()) {
    const error = statsResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
  }

  // Map tasks with their assignments
  const tasksWithAssignments: Task[] = tasksList.map(task => ({
    id: task.id,
    name: task.name,
    description: task.description,
    categoryId: task.categoryId,
    categoryName: task.categoryName || 'Uncategorized',
    storyPoints: task.storyPoints,
    isTemplateTask: task.isTemplateTask,
    isCompleted: task.isCompleted,
    completedAt: task.completedAt?.toISOString() || null,
    completedBy: task.completedBy,
    dueDate: task.dueDate?.toISOString() || null,
    assignedUsers: assignments
      .filter(assignment => assignment.taskId === task.id)
      .map(assignment => ({
        userId: assignment.userId,
        firstName: assignment.firstName,
        lastName: assignment.lastName,
      })),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));

  // Map categories to the expected format
  const mappedCategories: Category[] = categoriesResult.value.map(category => ({
    id: category.id,
    name: category.name,
    description: category.description,
    householdId: category.householdId,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }));

  // Map stats to the expected format
  const mappedStats: PlanStats = {
    totalTasks: statsResult.value.totalTasks,
    completedTasks: statsResult.value.completedTasks,
    totalStoryPoints: statsResult.value.totalStoryPoints,
    completedStoryPoints: statsResult.value.completedStoryPoints,
    completionRate: statsResult.value.tasksCompletionPercentage,
    storyPointCompletionRate: statsResult.value.storyPointsCompletionPercentage,
    categoryStats: [], // TODO: Implement category stats
    userStats: [], // TODO: Implement user stats
    previousMonth: null, // TODO: Implement previous month stats
  };

  // Construct the response according to the frontend's expected schema
  const response = {
    tasks: tasksWithAssignments,
    categories: mappedCategories,
    plan: mapMonthlyPlanModelToMonthlyPlan(plan),
    members: membersResult.value,
    stats: mappedStats,
  };

  return c.json(response, (200 as ContentfulStatusCode));
});

// Update task completion status
async function updateTaskCompletionStatus(
  taskId: number,
  isCompleted: boolean,
  completedBy?: number
): Promise<AppResult<typeof tasks.$inferSelect>> {
  try {
    const [updatedTask] = await db
      .update(tasks)
      .set({
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completedBy: isCompleted ? completedBy : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();
    if (updatedTask === undefined) {
      return err(createDatabaseQueryError("Failed to update task completion status"));
    }

    return ok(updatedTask);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to update task completion status", error));
  }
}

// Complete/uncomplete a task
monthlyPlanRoutes.patch(
  "/tasks/:taskId/complete",
  zValidator("json", completeTaskSchema),
  async (c) => {
    const user = c.get("user");
    const taskId = Number.parseInt(c.req.param("taskId"));
    const { isCompleted } = await c.req.valid("json");

    if (Number.isNaN(taskId)) {
      const error = createInvalidInputError("Invalid task ID");
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 400) as ContentfulStatusCode);
    }

    // Get the task with category and assignments
    const taskResult = await getTaskWithCategoryNameAndAssignments(taskId);

    if (taskResult.isErr()) {
      const error = taskResult.error;
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 404) as ContentfulStatusCode);
    }

    const task = taskResult.value;

    // Get the plan
    const planResult = await getPlanById(task.monthlyPlanId);

    if (planResult.isErr()) {
      const error = planResult.error;
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 404) as ContentfulStatusCode);
    }

    const plan = planResult.value;

    // Verify user is a member of this household
    const membershipResult = await verifyHouseholdMembership(user.id, plan.householdId);

    if (membershipResult.isErr()) {
      const error = membershipResult.error;
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 403) as ContentfulStatusCode);
    }

    // Check if the plan is closed
    if (plan.isClosed) {
      const error = createInvalidInputError("Cannot update tasks in a closed plan");
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 400) as ContentfulStatusCode);
    }

    // Update the task completion status
    const updateResult = await updateTaskCompletionStatus(
      taskId,
      isCompleted,
      isCompleted ? user.id : undefined
    );

    if (updateResult.isErr()) {
      const error = updateResult.error;
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
    }

    // Get the updated task with category and assignments
    const updatedTaskResult = await getTaskWithCategoryNameAndAssignments(taskId);

    if (updatedTaskResult.isErr()) {
      const error = updatedTaskResult.error;
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 404) as ContentfulStatusCode);
    }

    return c.json({ task: updatedTaskResult.value }, (200 as ContentfulStatusCode));
  }
);


// Define a custom response type that includes the JSON payload type.
interface TypedResponse<T> extends Response {
  // Optionally, add a helper method that returns the parsed JSON with type T.
  json: () => Promise<T>;
}

// Add a new task to a plan
monthlyPlanRoutes.post(
  "/:id/tasks",
  zValidator("json", createTaskSchema),
  async (c): Promise<TypedResponse<Task>> => {
    const user = c.get("user");
    const planId = Number.parseInt(c.req.param("id"));
    const {
      categoryId,
      name,
      description,
      storyPoints,
      assignedUserIds,
      dueDate,
    } = await c.req.valid("json");

    if (Number.isNaN(planId)) {
      const error = createInvalidInputError("Invalid plan ID");
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 400) as ContentfulStatusCode);
    }

    // Get the plan
    const planResult = await getPlanById(planId);

    if (planResult.isErr()) {
      const error = planResult.error;
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 404) as ContentfulStatusCode);
    }

    const plan = planResult.value;

    // Verify user is a member of this household
    const membershipResult = await verifyHouseholdMembership(user.id, plan.householdId);

    if (membershipResult.isErr()) {
      const error = membershipResult.error;
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 403) as ContentfulStatusCode);
    }

    // Check if the plan is closed
    if (plan.isClosed) {
      const error = createInvalidInputError("Cannot add tasks to a closed plan");
      return c.json({ message: error.message, type: error.type }, (error.statusCode || 400) as ContentfulStatusCode);
    }

    // Create the task
    try {
      const [newTask] = await db
        .insert(tasks)
        .values({
          monthlyPlanId: planId,
          categoryId,
          name,
          description,
          storyPoints,
          isTemplateTask: false,
          dueDate: dueDate ? new Date(dueDate) : null,
        })
        .returning();
      if (newTask === undefined) {
        return c.json({ message: "Failed to create task" }, (500) as ContentfulStatusCode);
      }

      // Create assignments
      if (assignedUserIds && assignedUserIds.length > 0) {
        const assignmentsResult = await createTaskAssignments(newTask.id, assignedUserIds);

        if (assignmentsResult.isErr()) {
          const error = assignmentsResult.error;
          return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
        }
      }

      // Get the complete task data with category name and assignments
      const taskResult = await getTaskWithCategoryNameAndAssignments(newTask.id);

      if (taskResult.isErr()) {
        const error = taskResult.error;
        return c.json({ message: error.message, type: error.type }, (error.statusCode || 500) as ContentfulStatusCode);
      }

      const { monthlyPlanId, ...task } = taskResult.value;

      // Type assertion to ensure the response matches the expected type
      const response = { task, cheese: "yummy" };
      return c.json(response, (201 as ContentfulStatusCode));
    } catch (error) {
      const dbError = createDatabaseQueryError("Failed to create task", error);
      return c.json({ message: dbError.message, type: dbError.type }, (dbError.statusCode || 500) as ContentfulStatusCode);
    }
  }
);

// Close/reopen a monthly plan
monthlyPlanRoutes.put("/:id/status", async (c) => {
  const user = c.get("user");
  const planId = Number.parseInt(c.req.param("id"));
  const { isClosed } = await c.req.json<{ isClosed: boolean }>();

  if (Number.isNaN(planId)) {
    const error = createInvalidInputError("Invalid plan ID");
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 400) as ContentfulStatusCode);
  }

  // Get the plan
  const planResult = await getPlanById(planId);

  if (planResult.isErr()) {
    const error = planResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 404) as ContentfulStatusCode);
  }

  const plan = planResult.value;

  // Verify user is a member of this household
  const membershipResult = await verifyHouseholdMembership(user.id, plan.householdId);

  if (membershipResult.isErr()) {
    const error = membershipResult.error;
    return c.json({ message: error.message, type: error.type }, (error.statusCode || 403) as ContentfulStatusCode);
  }

  // Update the plan status
  try {
    const [updatedPlan] = await db
      .update(monthlyPlans)
      .set({
        isClosed,
        updatedAt: new Date(),
      })
      .where(eq(monthlyPlans.id, planId))
      .returning();

    return c.json({ plan: updatedPlan }, (200 as ContentfulStatusCode));
  } catch (error) {
    const dbError = createDatabaseQueryError("Failed to update plan status", error);
    return c.json({ message: dbError.message, type: dbError.type }, (dbError.statusCode || 500) as ContentfulStatusCode);
  }
});

export default monthlyPlanRoutes;
