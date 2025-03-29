/**
 * SHARED TYPES
 *
 * This file contains type definitions shared between the frontend and backend.
 * These represent the "contract" or API between client and server.
 */

// User types
export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  defaultHouseholdId?: number; // Updated to include defaultHouseholdId
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Household types
export interface Household {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
}

export interface HouseholdMember {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  isOwner: boolean;
}

export interface HouseholdDetail extends Household {
  members: HouseholdMember[];
  isOwner: boolean;
}

// Category types
export interface Category {
  id: number;
  name: string;
  description: string | null;
  householdId: number;
  createdAt: string;
  updatedAt: string;
}

// Template types
export interface Template {
  id: number;
  name: string;
  description: string | null;
  householdId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateTask {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  timesPerMonth: number;
  storyPoints: number;
  assignToAll: boolean;
  assignedUsers: {
    userId: number;
    firstName: string;
    lastName: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetail extends Template {
  tasks: TemplateTask[];
  categories: Category[];
  members: {
    id: number;
    firstName: string;
    lastName: string;
  }[];
}

// Monthly plan types
export interface MonthlyPlan {
  id: number;
  householdId: number;
  month: number;
  year: number;
  name: string;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  storyPoints: number;
  isTemplateTask: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: number | null;
  dueDate: string | null;
  assignedUsers: {
    userId: number;
    firstName: string;
    lastName: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// Statistic types
export interface CategoryStats {
  categoryId: number;
  categoryName: string;
  totalTasks: number;
  completedTasks: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
}

export interface UserStats {
  userId: number;
  firstName: string;
  lastName: string;
  totalTasks: number;
  completedTasks: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
}

export interface PlanStats {
  totalTasks: number;
  completedTasks: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  completionRate: number;
  storyPointCompletionRate: number;
  categoryStats: CategoryStats[];
  userStats: UserStats[];
  previousMonth: {
    totalTasks: number;
    completedTasks: number;
    totalStoryPoints: number;
    completedStoryPoints: number;
    completionRate: number;
    storyPointCompletionRate: number;
  } | null;
}

export interface MonthlyPlanDetail extends MonthlyPlan {
  tasks: Task[];
  categories: Category[];
  members: {
    id: number;
    firstName: string;
    lastName: string;
  }[];
  stats: PlanStats;
}

// API Request types
export interface CreateUserRequest {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  isAdmin?: boolean;
  defaultHouseholdId?: number;
}

export interface CreateHouseholdRequest {
  name: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  householdId: number;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  householdId: number;
}

export interface CreateTemplateTaskRequest {
  name: string;
  description?: string;
  categoryId: number;
  timesPerMonth: number;
  storyPoints: number;
  assignToAll: boolean;
  assignedUserIds?: number[];
}

export interface CreateMonthlyPlanRequest {
  householdId: number;
  month: number;
  year: number;
  name: string;
  templateId?: number;
}

export interface CreateTaskRequest {
  monthlyPlanId: number;
  categoryId: number;
  name: string;
  description?: string;
  storyPoints: number;
  isTemplateTask?: boolean;
  assignedUserIds: number[];
  dueDate?: string;
}

export interface CompleteTaskRequest {
  isCompleted: boolean;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
