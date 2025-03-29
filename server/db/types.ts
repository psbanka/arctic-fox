import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  households,
  householdMembers,
  categories,
  templates,
  templateTasks,
  templateTaskAssignments,
  monthlyPlans,
  tasks,
  taskAssignments
} from "./schema";

// Import shared API types
import * as SharedTypes from "@shared/types";

// Database model types (internal to the server)
export type UserModel = InferSelectModel<typeof users>;
export type HouseholdModel = InferSelectModel<typeof households>;
export type HouseholdMemberModel = InferSelectModel<typeof householdMembers>;
export type CategoryModel = InferSelectModel<typeof categories>;
export type TemplateModel = InferSelectModel<typeof templates>;
export type TemplateTaskModel = InferSelectModel<typeof templateTasks>;
export type TemplateTaskAssignmentModel = InferSelectModel<typeof templateTaskAssignments>;
export type MonthlyPlanModel = InferSelectModel<typeof monthlyPlans>;
export type TaskModel = InferSelectModel<typeof tasks>;
export type TaskAssignmentModel = InferSelectModel<typeof taskAssignments>;

// Insert types
export type NewUser = InferInsertModel<typeof users>;
export type NewHousehold = InferInsertModel<typeof households>;
export type NewHouseholdMember = InferInsertModel<typeof householdMembers>;
export type NewCategory = InferInsertModel<typeof categories>;
export type NewTemplate = InferInsertModel<typeof templates>;
export type NewTemplateTask = InferInsertModel<typeof templateTasks>;
export type NewTemplateTaskAssignment = InferInsertModel<typeof templateTaskAssignments>;
export type NewMonthlyPlan = InferInsertModel<typeof monthlyPlans>;
export type NewTask = InferInsertModel<typeof tasks>;
export type NewTaskAssignment = InferInsertModel<typeof taskAssignments>;

// Re-export the shared types for use in the server
export type User = SharedTypes.User;
export type Household = SharedTypes.Household;
export type HouseholdMember = SharedTypes.HouseholdMember;
export type Category = SharedTypes.Category;
export type Template = SharedTypes.Template;
export type TemplateTask = SharedTypes.TemplateTask;
export type MonthlyPlan = SharedTypes.MonthlyPlan;
export type Task = SharedTypes.Task;
export type PlanStats = SharedTypes.PlanStats;
export type CategoryStats = SharedTypes.CategoryStats;
export type UserStats = SharedTypes.UserStats;

// Type mapping functions to convert between database models and API types
export function mapUserModelToUser(model: UserModel): User {
  return {
    id: model.id,
    username: model.username,
    firstName: model.firstName,
    lastName: model.lastName,
    isAdmin: model.isAdmin,
    createdAt: model.createdAt?.toISOString(),
  };
}

export function mapHouseholdModelToHousehold(model: HouseholdModel): Household {
  return {
    id: model.id,
    name: model.name,
    createdAt: model.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: model.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

export function mapCategoryModelToCategory(model: CategoryModel): Category {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    householdId: model.householdId,
    createdAt: model.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: model.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

export function mapTemplateModelToTemplate(model: TemplateModel): Template {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    householdId: model.householdId,
    createdAt: model.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: model.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

export function mapMonthlyPlanModelToMonthlyPlan(model: MonthlyPlanModel): MonthlyPlan {
  return {
    id: model.id,
    householdId: model.householdId,
    month: model.month,
    year: model.year,
    name: model.name,
    isClosed: model.isClosed,
    createdAt: model.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: model.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

export function mapTaskModelToTask(model: TaskModel): Omit<Task, "categoryName" | "assignedUsers"> {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    categoryId: model.categoryId,
    storyPoints: model.storyPoints,
    isTemplateTask: model.isTemplateTask,
    isCompleted: model.isCompleted,
    completedAt: model.completedAt?.toISOString() || null,
    completedBy: model.completedBy,
    dueDate: model.dueDate?.toISOString() || null,
    createdAt: model.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: model.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

// Request type conversions for API endpoints
export function createUserRequestToNewUser(
  request: SharedTypes.CreateUserRequest,
  passwordHash: string
): NewUser {
  return {
    username: request.username,
    passwordHash,
    firstName: request.firstName,
    lastName: request.lastName,
    isAdmin: request.isAdmin || false,
  };
}

export function createHouseholdRequestToNewHousehold(
  request: SharedTypes.CreateHouseholdRequest
): NewHousehold {
  return {
    name: request.name,
  };
}

export function createCategoryRequestToNewCategory(
  request: SharedTypes.CreateCategoryRequest
): NewCategory {
  return {
    name: request.name,
    description: request.description || null,
    householdId: request.householdId,
  };
}

export function createTemplateRequestToNewTemplate(
  request: SharedTypes.CreateTemplateRequest
): NewTemplate {
  return {
    name: request.name,
    description: request.description || null,
    householdId: request.householdId,
  };
}

export function createMonthlyPlanRequestToNewMonthlyPlan(
  request: SharedTypes.CreateMonthlyPlanRequest
): NewMonthlyPlan {
  return {
    householdId: request.householdId,
    month: request.month,
    year: request.year,
    name: request.name,
    isClosed: false,
  };
}

// Extended types with relations (for internal use)
export interface UserWithRelations extends UserModel {
  households?: HouseholdModel[];
}

export interface HouseholdWithMembers extends HouseholdModel {
  members?: HouseholdMemberModel[];
}

export interface HouseholdMemberWithUser extends HouseholdMemberModel {
  user?: UserModel;
}

export interface TemplateWithTasks extends TemplateModel {
  tasks?: TemplateTaskModel[];
}

export interface TaskWithAssignees extends TaskModel {
  assignees?: TaskAssignmentModel[];
}

export interface MonthlyPlanWithDetails extends MonthlyPlanModel {
  tasks: TaskWithAssignees[];
}
