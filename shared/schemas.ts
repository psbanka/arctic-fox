import { z } from "zod";
import type { CreateUserRequest } from "./types";

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export const completeTaskSchema = z.object({
  isCompleted: z.boolean(),
});

// Form validation schema for creating a task
export const createTaskSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  categoryId: z.number().positive('Please select a category'),
  timesPerMonth: z
    .number()
    .min(1, 'Times per month must be at least 1')
    .max(31, 'Times per month cannot exceed 31'),
  isTemplateTask: z.boolean().default(false),
  monthlyPlanId: z.number().int().positive(),
  dueDate: z.string().optional(),
  storyPoints: z.number().int().positive().refine((val) => {
    return FIBONACCI.includes(val);
  }, "Story points must be a Fibonacci number (1, 2, 3, 5, 8, 13, 21, etc.)"),
  assignToAll: z.boolean(),
  assignedUserIds: z.array(z.number()).optional(),
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, and ._-'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  isAdmin: z.boolean().default(false),
});

// Create category schema
export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  householdId: z.number().int().positive(),
});

export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  householdId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createHouseholdSchema = z.object({
  name: z.string().min(1, "Household name is required"),
});

export const addMemberSchema = z.object({
  userId: z.number().int().positive(),
  isOwner: z.boolean().optional().default(false),
});

export const createMonthlyPlanSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  householdId: z.number().positive('Please select a household'),
  templateId: z.number().positive('Please select a template'),
});

export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  householdId: z.number().positive('Please select a household'),
});

export const createTemplateTaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  categoryId: z.number().int().positive(),
  timesPerMonth: z.number().int().min(1, "Must be at least 1"),
  storyPoints: z.number().int().positive().refine((val) => {
    return FIBONACCI.includes(val);
  }, "Story points must be a Fibonacci number (1, 2, 3, 5, 8, 13, 21, etc.)"),
  assignToAll: z.boolean().default(false),
  assignedUserIds: z.array(z.number().int().positive()).optional(),
});

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  isAdmin: z.boolean(),
  defaultHouseholdId: z.number().optional(),
  createdAt: z.string().optional(),
});

export const householdSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isOwner: z.boolean().optional(),
});

export const householdMemberSchema = z.object({
  id: z.number(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  isOwner: z.boolean(),
});

export const householdDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isOwner: z.boolean(),
  members: z.array(householdMemberSchema),
});

export const templateTaskSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.number(),
  categoryName: z.string(),
  timesPerMonth: z.number(),
  storyPoints: z.number(),
  assignToAll: z.boolean(),
  assignedUsers: z.array(
    z.object({
      userId: z.number(),
      firstName: z.string(),
      lastName: z.string(),
    })
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const templateSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  householdId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const templateDetailSchema = templateSchema.extend({
  tasks: z.array(templateTaskSchema),
  categories: z.array(categorySchema),
  members: z.array(
    z.object({
      id: z.number(),
      firstName: z.string(),
      lastName: z.string(),
    })
  ),
});

export const taskSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.number(),
  categoryName: z.string(),
  storyPoints: z.number(),
  isTemplateTask: z.boolean(),
  isCompleted: z.boolean(),
  completedAt: z.string().nullable(),
  completedBy: z.number().nullable(),
  dueDate: z.string().nullable(),
  assignedUsers: z.array(
    z.object({
      userId: z.number(),
      firstName: z.string(),
      lastName: z.string(),
    })
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const monthlyPlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  householdId: z.number(),
  month: z.number(),
  year: z.number(),
  isClosed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// TODO
/*
const categoryStatsSchema = z.object({
  categoryId: z.number(),
  categoryName: z.string(),
  totalTasks: z.number(),
  completedTasks: z.number(),
  totalStoryPoints: z.number(),
  completedStoryPoints: z.number(),
});
*/
// TODO
/*
const userStatsSchema = z.object({
  userId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  totalTasks: z.number(),
  completedTasks: z.number(),
  totalStoryPoints: z.number(),
  completedStoryPoints: z.number(),
});
*/

const planStatsSchema = z.object({
  totalTasks: z.number(),
  completedTasks: z.number(),
  totalStoryPoints: z.number(),
  completedStoryPoints: z.number(),
  // categoryStats: z.array(categoryStatsSchema),
  // userStats: z.array(userStatsSchema),
  previousMonth: z
    .object({
      totalTasks: z.number(),
      completedTasks: z.number(),
      totalStoryPoints: z.number(),
      completedStoryPoints: z.number(),
    })
    .nullable(),
});

export const monthlyPlanDetailSchema = z.object({
  tasks: z.array(taskSchema),
  categories: z.array(categorySchema),
  plan: monthlyPlanSchema,
  members: z.array(
    z.object({
      id: z.number(),
      firstName: z.string(),
      lastName: z.string(),
    })
  ),
  stats: planStatsSchema,
});

export const createUserRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  isAdmin: z.boolean().optional(),
});

export const createHouseholdRequestSchema = z.object({
  name: z.string(),
});

export const createCategoryRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  householdId: z.number(),
});

export const createTemplateRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  householdId: z.number(),
});

export const createTemplateTaskRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.number(),
  timesPerMonth: z.number(),
  storyPoints: z.number(),
  assignToAll: z.boolean(),
  assignedUserIds: z.array(z.number()).optional(),
});

export const createMonthlyPlanRequestSchema = z.object({
  householdId: z.number(),
  month: z.number(),
  year: z.number(),
  name: z.string(),
  templateId: z.number().optional(),
});

export const createTaskRequestSchema = z.object({
  monthlyPlanId: z.number(),
  categoryId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  storyPoints: z.number(),
  isTemplateTask: z.boolean().optional(),
  assignedUserIds: z.array(z.number()),
  dueDate: z.string().optional(),
});

export const completeTaskRequestSchema = z.object({
  isCompleted: z.boolean(),
});

