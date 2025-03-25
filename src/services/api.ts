import axios from 'axios';
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

// API service object with methods for all endpoints
const api = {
  // Auth endpoints
  auth: {
    login: async (username: string, password: string): Promise<AuthResponse> => {
      const response = await axios.post<AuthResponse>('/auth/login', { username, password });
      return response.data;
    },
    me: async (): Promise<{ user: User }> => {
      const response = await axios.get<{ user: User }>('/auth/me');
      return response.data;
    },
  },

  // Admin endpoints
  admin: {
    getUsers: async (): Promise<User[]> => {
      const response = await axios.get<{ users: User[] }>('/auth/users');
      return response.data.users;
    },
    createUser: async (userData: CreateUserRequest): Promise<User> => {
      const response = await axios.post<{ user: User }>('/auth/users', userData);
      return response.data.user;
    },
  },

  // Households endpoints
  households: {
    getAll: async (): Promise<Household[]> => {
      const response = await axios.get<{ households: Household[] }>('/households');
      return response.data.households;
    },
    getById: async (id: number): Promise<HouseholdDetail> => {
      const response = await axios.get<HouseholdDetail>(`/households/${id}`);
      return response.data;
    },
    create: async (name: string): Promise<Household> => {
      const request: CreateHouseholdRequest = { name };
      const response = await axios.post<{ household: Household }>('/households', request);
      return response.data.household;
    },
    update: async (id: number, name: string): Promise<Household> => {
      const request: CreateHouseholdRequest = { name };
      const response = await axios.put<{ household: Household }>(`/households/${id}`, request);
      return response.data.household;
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
      return response.data.member;
    },
    removeMember: async (householdId: number, userId: number): Promise<void> => {
      await axios.delete(`/households/${householdId}/members/${userId}`);
    },
  },

  // Categories endpoints
  categories: {
    getByHousehold: async (householdId: number): Promise<Category[]> => {
      const response = await axios.get<{ categories: Category[] }>(`/categories/household/${householdId}`);
      return response.data.categories;
    },
    create: async (
      name: string,
      description: string | null,
      householdId: number
    ): Promise<Category> => {
      const request: CreateCategoryRequest = {
        name,
        description: description || undefined,
        householdId,
      };
      const response = await axios.post<{ category: Category }>('/categories', request);
      return response.data.category;
    },
    update: async (
      id: number,
      name: string,
      description: string | null
    ): Promise<Category> => {
      const response = await axios.put<{ category: Category }>(`/categories/${id}`, {
        name,
        description,
      });
      return response.data.category;
    },
    delete: async (id: number): Promise<void> => {
      await axios.delete(`/categories/${id}`);
    },
  },

  // Templates endpoints
  templates: {
    getByHousehold: async (householdId: number): Promise<Template[]> => {
      const response = await axios.get<{ templates: Template[] }>(`/templates/household/${householdId}`);
      return response.data.templates;
    },
    getById: async (id: number): Promise<TemplateDetail> => {
      const response = await axios.get<TemplateDetail>(`/templates/${id}`);
      return response.data;
    },
    create: async (
      name: string,
      description: string | null,
      householdId: number
    ): Promise<Template> => {
      const request: CreateTemplateRequest = {
        name,
        description: description || undefined,
        householdId,
      };
      const response = await axios.post<{ template: Template }>('/templates', request);
      return response.data.template;
    },
    addTask: async (
      templateId: number,
      task: CreateTemplateTaskRequest
    ): Promise<TemplateTask> => {
      const response = await axios.post<{ task: TemplateTask }>(`/templates/${templateId}/tasks`, task);
      return response.data.task;
    },
    updateTask: async (
      taskId: number,
      task: CreateTemplateTaskRequest
    ): Promise<TemplateTask> => {
      const response = await axios.put<{ task: TemplateTask }>(`/templates/tasks/${taskId}`, task);
      return response.data.task;
    },
    deleteTask: async (taskId: number): Promise<void> => {
      await axios.delete(`/templates/tasks/${taskId}`);
    },
  },

  // Monthly Plans endpoints
  monthlyPlans: {
    getByHousehold: async (householdId: number): Promise<MonthlyPlan[]> => {
      const response = await axios.get<{ plans: MonthlyPlan[] }>(`/monthly-plans/household/${householdId}`);
      return response.data.plans;
    },
    getById: async (id: number): Promise<MonthlyPlanDetail> => {
      const response = await axios.get<MonthlyPlanDetail>(`/monthly-plans/${id}`);
      return response.data;
    },
    create: async (plan: CreateMonthlyPlanRequest): Promise<MonthlyPlan> => {
      const response = await axios.post<{ plan: MonthlyPlan }>('/monthly-plans', plan);
      return response.data.plan;
    },
    addTask: async (task: CreateTaskRequest): Promise<Task> => {
      const response = await axios.post<{ task: Task }>('/monthly-plans/tasks', task);
      return response.data.task;
    },
    completeTask: async (
      taskId: number,
      isCompleted: boolean
    ): Promise<Task> => {
      const request: CompleteTaskRequest = { isCompleted };
      const response = await axios.patch<{ task: Task }>(`/monthly-plans/tasks/${taskId}/complete`, request);
      return response.data.task;
    },
    closePlan: async (id: number): Promise<MonthlyPlan> => {
      const response = await axios.patch<{ plan: MonthlyPlan }>(`/monthly-plans/${id}/close`);
      return response.data.plan;
    },
  },
};

export default api;
