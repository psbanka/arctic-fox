import axios, { type AxiosError } from 'axios';
import { z } from 'zod';
import type {
  User,
  AuthResponse,
  Household,
  HouseholdDetail,
  HouseholdMember,
  Category,
  Template,
  TemplateDetail,
  TemplateTask,
  MonthlyPlan,
  MonthlyPlanDetail,
  Task,
  CreateUserRequest,
  CreateHouseholdRequest,
  CreateCategoryRequest,
  CreateTemplateRequest,
  CreateTemplateTaskRequest,
  CreateMonthlyPlanRequest,
  CreateTaskRequest,
  CompleteTaskRequest
} from '@shared/types';

// Set base URL for API requests
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '/api';

/*
// Custom error class for API validation errors
class ApiValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodError,
    public requestDetails?: {
      url?: string;
      method?: string;
      requestData?: unknown;
      responseData?: unknown;
    }
  ) {
    super(message);
    this.name = 'ApiValidationError';
  }

  toString(): string {
    const details = this.requestDetails;
    const validationErrors = this.errors.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ).join('\n');

    let message = `API Validation Error: ${this.message}\n`;
    
    if (details) {
      message += `\nRequest Details:\n`;
      if (details.url) message += `URL: ${details.url}\n`;
      if (details.method) message += `Method: ${details.method}\n`;
      if (details.requestData) message += `Request Data: ${JSON.stringify(details.requestData, null, 2)}\n`;
      if (details.responseData) message += `Response Data: ${JSON.stringify(details.responseData, null, 2)}\n`;
    }
    
    message += `\nValidation Errors:\n${validationErrors}`;
    
    return message;
  }
}
*/

// Helper function to handle API errors
const handleApiError = (error: unknown) => {
  if (error instanceof z.ZodError) {
    // Try to get request details from the error if it's an Axios error
    const axiosError = (error as { cause?: AxiosError }).cause;
    const requestDetails = axiosError ? {
      url: axiosError.config?.url,
      method: axiosError.config?.method?.toUpperCase(),
      requestData: axiosError.config?.data ? JSON.parse(axiosError.config.data) : undefined,
      responseData: axiosError.response?.data,
    } : undefined;

    console.warn(axiosError);
    console.error(
      'API response validation failed',
      error,
      requestDetails
    );
    return
  }

  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.message;
    const details = {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      requestData: error.config?.data ? JSON.parse(error.config.data) : undefined,
      responseData: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    };

    const errorMessage = [
      `API Error: ${message}`,
      `URL: ${details.url}`,
      `Method: ${details.method}`,
      `Status: ${details.status} ${details.statusText}`,
      details.requestData ? `Request Data: ${JSON.stringify(details.requestData, null, 2)}` : '',
      details.responseData ? `Response Data: ${JSON.stringify(details.responseData, null, 2)}` : ''
    ].filter(Boolean).join('\n');

    console.error(errorMessage);
  }
};

// Zod schemas for API responses
const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  isAdmin: z.boolean(),
  defaultHouseholdId: z.number().optional(),
  createdAt: z.string().optional(),
});

const householdSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isOwner: z.boolean().optional(),
});

const householdMemberSchema = z.object({
  id: z.number(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  isOwner: z.boolean(),
});

const householdDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isOwner: z.boolean(),
  members: z.array(householdMemberSchema),
});

const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  householdId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const templateTaskSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.number(),
  categoryName: z.string(),
  timesPerMonth: z.number(),
  storyPoints: z.number(),
  assignToAll: z.boolean(),
  assignedUsers: z.array(z.object({
    userId: z.number(),
    firstName: z.string(),
    lastName: z.string(),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const templateSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  householdId: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const templateDetailSchema = templateSchema.extend({
  tasks: z.array(templateTaskSchema),
  categories: z.array(categorySchema),
  members: z.array(z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
  })),
});

const taskSchema = z.object({
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
  assignedUsers: z.array(z.object({
    userId: z.number(),
    firstName: z.string(),
    lastName: z.string(),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const monthlyPlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  householdId: z.number(),
  month: z.number(),
  year: z.number(),
  isActive: z.boolean(),
  isClosed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const categoryStatsSchema = z.object({
  categoryId: z.number(),
  categoryName: z.string(),
  totalTasks: z.number(),
  completedTasks: z.number(),
  totalStoryPoints: z.number(),
  completedStoryPoints: z.number(),
});

const userStatsSchema = z.object({
  userId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  totalTasks: z.number(),
  completedTasks: z.number(),
  totalStoryPoints: z.number(),
  completedStoryPoints: z.number(),
});

const planStatsSchema = z.object({
  totalTasks: z.number(),
  completedTasks: z.number(),
  totalStoryPoints: z.number(),
  completedStoryPoints: z.number(),
  completionRate: z.number(),
  storyPointCompletionRate: z.number(),
  categoryStats: z.array(categoryStatsSchema),
  userStats: z.array(userStatsSchema),
  previousMonth: z.object({
    totalTasks: z.number(),
    completedTasks: z.number(),
    totalStoryPoints: z.number(),
    completedStoryPoints: z.number(),
    completionRate: z.number(),
    storyPointCompletionRate: z.number(),
  }).nullable(),
});

const monthlyPlanDetailSchema = monthlyPlanSchema.extend({
  tasks: z.array(taskSchema),
  categories: z.array(categorySchema),
  members: z.array(z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
  })),
  stats: planStatsSchema,
});

// Request schemas
const createUserRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  isAdmin: z.boolean().optional(),
});

const createHouseholdRequestSchema = z.object({
  name: z.string(),
});

const createCategoryRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  householdId: z.number(),
});

const createTemplateRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  householdId: z.number(),
});

const createTemplateTaskRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.number(),
  timesPerMonth: z.number(),
  storyPoints: z.number(),
  assignToAll: z.boolean(),
  assignedUserIds: z.array(z.number()).optional(),
});

const createMonthlyPlanRequestSchema = z.object({
  householdId: z.number(),
  month: z.number(),
  year: z.number(),
  name: z.string(),
  templateId: z.number().optional(),
});

const createTaskRequestSchema = z.object({
  monthlyPlanId: z.number(),
  categoryId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  storyPoints: z.number(),
  isTemplateTask: z.boolean().optional(),
  assignedUserIds: z.array(z.number()),
  dueDate: z.string().optional(),
});

const completeTaskRequestSchema = z.object({
  isCompleted: z.boolean(),
});

// Derive TypeScript types from Zod schemas
type UserResponse = z.infer<typeof userSchema>;
type HouseholdResponse = z.infer<typeof householdSchema>;
type HouseholdDetailResponse = z.infer<typeof householdDetailSchema>;
type CategoryResponse = z.infer<typeof categorySchema>;
type TemplateResponse = z.infer<typeof templateSchema>;
type TemplateDetailResponse = z.infer<typeof templateDetailSchema>;
type TemplateTaskResponse = z.infer<typeof templateTaskSchema>;
type TaskResponse = z.infer<typeof taskSchema>;
type MonthlyPlanResponse = z.infer<typeof monthlyPlanSchema>;
type MonthlyPlanDetailResponse = z.infer<typeof monthlyPlanDetailSchema>;

// Use imported types instead of schema inference
type CreateUserRequestType = CreateUserRequest;
// type CreateHouseholdRequestType = CreateHouseholdRequest;
// type CreateCategoryRequestType = CreateCategoryRequest;
// type CreateTemplateRequestType = CreateTemplateRequest;
type CreateTemplateTaskRequestType = CreateTemplateTaskRequest;
type CreateMonthlyPlanRequestType = CreateMonthlyPlanRequest;
type CreateTaskRequestType = CreateTaskRequest;
// type CompleteTaskRequestType = CompleteTaskRequest;

// Export the types to mark them as used
export type {
  User,
  Household,
  HouseholdDetail,
  Category,
  Template,
  TemplateDetail,
  TemplateTask,
  MonthlyPlan,
  MonthlyPlanDetail,
  Task,
  CreateUserRequest,
  CreateHouseholdRequest,
  CreateCategoryRequest,
  CreateTemplateRequest,
  CreateTemplateTaskRequest,
  CreateMonthlyPlanRequest,
  CreateTaskRequest,
  CompleteTaskRequest
};

// API service object with methods for all endpoints
const api = {
  // Auth endpoints
  auth: {
    login: async (username: string, password: string): Promise<AuthResponse> => {
        const response = await axios.post<AuthResponse>('/auth/login', { username, password });
        return z.object({ 
          token: z.string(),
          user: userSchema 
        }).parse(response.data);
    },
    me: async (): Promise<{ user: UserResponse }> => {
        const response = await axios.get<{ user: UserResponse }>('/auth/me');
        return z.object({ user: userSchema }).parse(response.data);
    },
  },

  // Admin endpoints
  admin: {
    getUsers: async (): Promise<UserResponse[]> => {
        const response = await axios.get<{ users: UserResponse[] }>('/auth/users');
        const output = z.object({ users: z.array(userSchema) }).parse(response.data);
        return output.users;
    },
    createUser: async (userData: CreateUserRequestType): Promise<UserResponse> => {
        const validatedRequest = createUserRequestSchema.parse(userData);
        const response = await axios.post<{ user: UserResponse }>('/auth/users', validatedRequest);
        return z.object({ user: userSchema }).parse(response.data).user;
    },
  },

  // Households endpoints
  households: {
    getAll: async (): Promise<HouseholdResponse[]> => {
      const response = await axios.get('/households');
      const validatedData = z.array(householdSchema).parse(response.data);
      return validatedData;
    },
    getById: async (id: number): Promise<HouseholdDetailResponse> => {
      const response = await axios.get<HouseholdDetailResponse>(`/households/${id}`);
      const validatedData = householdDetailSchema.parse(response.data);
      return validatedData;
    },
    create: async (name: string): Promise<HouseholdResponse> => {
      const validatedRequest = createHouseholdRequestSchema.parse({ name });
      const response = await axios.post<{ household: HouseholdResponse }>('/households', validatedRequest);
      const validatedData = z.object({ household: householdSchema }).parse(response.data);
      return validatedData.household;
    },
    update: async (id: number, name: string): Promise<HouseholdResponse> => {
      const validatedRequest = createHouseholdRequestSchema.parse({ name });
      const response = await axios.put<{ household: HouseholdResponse }>(`/households/${id}`, validatedRequest);
      const validatedData = z.object({ household: householdSchema }).parse(response.data);
      return validatedData.household;
    },
    addMember: async (
      householdId: number,
      userId: number,
      isOwner = false
    ): Promise<HouseholdMember> => {
      const response = await axios.post<{ member: HouseholdMember }>(`/households/${householdId}/members`, {
        userId,
        isOwner,
      });
      const validatedData = z.object({ member: householdMemberSchema }).parse(response.data);
      return validatedData.member;
    },
    removeMember: async (householdId: number, userId: number): Promise<void> => {
      await axios.delete(`/households/${householdId}/members/${userId}`);
    },
  },

  // Categories endpoints
  categories: {
    getByHousehold: async (householdId: number): Promise<CategoryResponse[]> => {
      try {
        const response = await axios.get<{ categories: CategoryResponse[] }>(`/categories/household/${householdId}`);
        const validatedData = z.object({ categories: z.array(categorySchema) }).parse(response.data);
        return validatedData.categories;
      } catch (error) {
        handleApiError(error);
        return [];
      }
    },
    create: async (
      name: string,
      description: string | null,
      householdId: number
    ): Promise<CategoryResponse> => {
      const validatedRequest = createCategoryRequestSchema.parse({
        name,
        description,
        householdId,
      });
      const response = await axios.post<{ category: CategoryResponse }>('/categories', validatedRequest);
      const validatedData = z.object({ category: categorySchema }).parse(response.data);
      return validatedData.category;
    },
    update: async (
      id: number,
      name: string,
      description: string | null
    ): Promise<CategoryResponse> => {
      const validatedRequest = createCategoryRequestSchema.parse({
        name,
        description,
        householdId: id, // This might need to be adjusted based on your API
      });
      const response = await axios.put<{ category: CategoryResponse }>(`/categories/${id}`, validatedRequest);
      const validatedData = z.object({ category: categorySchema }).parse(response.data);
      return validatedData.category;
    },
    delete: async (id: number): Promise<void> => {
      await axios.delete(`/categories/${id}`);
    },
  },

  // Templates endpoints
  templates: {
    getByHousehold: async (householdId: number): Promise<TemplateResponse[]> => {
      const response = await axios.get<{ templates: TemplateResponse[] }>(`/templates/household/${householdId}`);
      const validatedData = z.object({ templates: z.array(templateSchema) }).parse(response.data);
      return validatedData.templates;
    },
    getById: async (id: number): Promise<TemplateDetailResponse> => {
      const response = await axios.get<TemplateDetailResponse>(`/templates/${id}`);
      const validatedData = templateDetailSchema.parse(response.data);
      return validatedData;
    },
    create: async (
      name: string,
      description: string | null,
      householdId: number
    ): Promise<TemplateResponse> => {
      const validatedRequest = createTemplateRequestSchema.parse({
        name,
        description,
        householdId,
      });
      const response = await axios.post<{ template: TemplateResponse }>('/templates', validatedRequest);
      const validatedData = z.object({ template: templateSchema }).parse(response.data);
      return validatedData.template;
    },
    addTask: async (
      templateId: number,
      task: CreateTemplateTaskRequestType
    ): Promise<TemplateTaskResponse> => {
      const validatedRequest = createTemplateTaskRequestSchema.parse(task);
      const response = await axios.post<{ task: TemplateTaskResponse }>(`/templates/${templateId}/tasks`, validatedRequest);
      const validatedData = z.object({ task: templateTaskSchema }).parse(response.data);
      return validatedData.task;
    },
    updateTask: async (
      taskId: number,
      task: CreateTemplateTaskRequestType
    ): Promise<TemplateTaskResponse> => {
      const validatedRequest = createTemplateTaskRequestSchema.parse(task);
      const response = await axios.put<{ task: TemplateTaskResponse }>(`/templates/tasks/${taskId}`, validatedRequest);
      const validatedData = z.object({ task: templateTaskSchema }).parse(response.data);
      return validatedData.task;
    },
    deleteTask: async (taskId: number): Promise<void> => {
      await axios.delete(`/templates/tasks/${taskId}`);
    },
  },

  // Monthly Plans endpoints
  monthlyPlans: {
    getByHousehold: async (householdId: number): Promise<MonthlyPlanResponse[]> => {
      try {
        const response = await axios.get<{ plans: MonthlyPlanResponse[] }>(`/monthly-plans/household/${householdId}`);
        const validatedData = z.object({ plans: z.array(monthlyPlanSchema) }).parse(response.data);
        return validatedData.plans;
        } catch (error) {
          handleApiError(error);
          return [];
        }
    },
    getById: async (id: number): Promise<MonthlyPlanDetailResponse> => {
        const response = await axios.get<MonthlyPlanDetailResponse>(`/monthly-plans/${id}`);
        const validatedData = monthlyPlanDetailSchema.parse(response.data);
        return validatedData;
    },
    create: async (data: CreateMonthlyPlanRequestType): Promise<MonthlyPlanResponse> => {
        try {
          const validatedRequest = createMonthlyPlanRequestSchema.parse(data);
          const response = await axios.post<{ plan: MonthlyPlanResponse }>('/monthly-plans', validatedRequest);
          const validatedData = z.object({ plan: monthlyPlanSchema }).parse(response.data);
          return validatedData.plan;
          } catch (error) {
            handleApiError(error);
            return {} as MonthlyPlanResponse;
          }
    },
    addTask: async (task: CreateTaskRequestType): Promise<TaskResponse> => {
      const validatedRequest = createTaskRequestSchema.parse(task);
      const response = await axios.post<{ task: TaskResponse }>('/monthly-plans/tasks', validatedRequest);
      const validatedData = z.object({ task: taskSchema }).parse(response.data);
      return validatedData.task;
    },
    completeTask: async (
      taskId: number,
      isCompleted: boolean
    ): Promise<TaskResponse> => {
      const validatedRequest = completeTaskRequestSchema.parse({ isCompleted });
      const response = await axios.patch<{ task: TaskResponse }>(`/monthly-plans/tasks/${taskId}/complete`, validatedRequest);
      const validatedData = z.object({ task: taskSchema }).parse(response.data);
      return validatedData.task;
    },
    closePlan: async (id: number): Promise<MonthlyPlanResponse> => {
      const response = await axios.patch<{ plan: MonthlyPlanResponse }>(`/monthly-plans/${id}/close`);
      const validatedData = z.object({ plan: monthlyPlanSchema }).parse(response.data);
      return validatedData.plan;
    },
  },
};

// Type for a function that can be wrapped
type ApiMethod = (...args: any[]) => Promise<any>;

// Wrap all API methods with error handling
const wrappedApi = Object.fromEntries(
  Object.entries(api).map(([key, value]) => [
    key,
    Object.fromEntries(
      Object.entries(value).map(([methodKey, method]) => [
        methodKey,
        async (...args: Parameters<typeof method>) => {
          try {
            return await (method as ApiMethod)(...args);
          } catch (error) {
            handleApiError(error);
          }
        },
      ])
    ),
  ])
) as typeof api;

export default wrappedApi;