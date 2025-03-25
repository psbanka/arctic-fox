import { http, HttpResponse, delay } from 'msw';
import { format } from 'date-fns';

// Sample data
const users = [
  {
    id: 1,
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    isAdmin: true,
    defaultHouseholdId: null,
    createdAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    username: 'john.doe',
    firstName: 'John',
    lastName: 'Doe',
    isAdmin: false,
    defaultHouseholdId: 1, // Doe Family household
    createdAt: '2023-01-02T00:00:00.000Z',
  },
  {
    id: 3,
    username: 'jane.doe',
    firstName: 'Jane',
    lastName: 'Doe',
    isAdmin: false,
    defaultHouseholdId: 1, // Doe Family household
    createdAt: '2023-01-03T00:00:00.000Z',
  },
];

const households = [
  {
    id: 1,
    name: 'Doe Family',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    isOwner: true,
  },
];

const householdMembers = [
  {
    id: 2,
    username: 'john.doe',
    firstName: 'John',
    lastName: 'Doe',
    isOwner: true,
  },
  {
    id: 3,
    username: 'jane.doe',
    firstName: 'Jane',
    lastName: 'Doe',
    isOwner: false,
  },
];

const categories = [
  {
    id: 1,
    name: 'Health',
    description: 'Physical and mental wellbeing activities',
    householdId: 1,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Family',
    description: 'Activities related to family connections',
    householdId: 1,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'Community',
    description: 'Community involvement and volunteering',
    householdId: 1,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: 4,
    name: 'Home',
    description: 'Home maintenance and improvement',
    householdId: 1,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
];

// Mock data for templates
let templates = [
  {
    id: 1,
    name: 'Monthly Household Chores',
    description: 'Regular household maintenance tasks',
    householdId: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Weekly Cleaning',
    description: 'Tasks for weekly cleaning rotation',
    householdId: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

let templateTasks = [
  {
    id: 1,
    name: 'Clean Bathroom',
    description: 'Clean sinks, toilets, and shower',
    categoryId: 1,
    categoryName: 'Cleaning',
    templateId: 1,
    timesPerMonth: 4,
    storyPoints: 5,
    assignToAll: false,
    assignedUsers: [
      { userId: 1, firstName: 'John', lastName: 'Doe' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Vacuum All Rooms',
    description: 'Vacuum the entire house',
    categoryId: 1,
    categoryName: 'Cleaning',
    templateId: 1,
    timesPerMonth: 8,
    storyPoints: 3,
    assignToAll: true,
    assignedUsers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Take Out Trash',
    description: 'Empty all trash cans and take to dumpster',
    categoryId: 2,
    categoryName: 'Maintenance',
    templateId: 1,
    timesPerMonth: 8,
    storyPoints: 1,
    assignToAll: false,
    assignedUsers: [
      { userId: 2, firstName: 'Jane', lastName: 'Smith' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// Generate current month plan
const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

const monthlyPlans = [
  {
    id: 1,
    householdId: 1,
    month: currentMonth,
    year: currentYear,
    name: `${format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')} Plan`,
    isClosed: false,
    createdAt: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
    updatedAt: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
  },
];

// Generate tasks for the current month plan
const tasks = templateTasks.flatMap((templateTask) => {
  const tasksForTemplate = [];
  for (let i = 0; i < templateTask.timesPerMonth; i++) {
    tasksForTemplate.push({
      id: templateTask.id * 100 + i,
      monthlyPlanId: 1,
      templateTaskId: templateTask.id,
      categoryId: templateTask.categoryId,
      categoryName: templateTask.categoryName,
      name: templateTask.name,
      description: templateTask.description,
      storyPoints: templateTask.storyPoints,
      isTemplateTask: true,
      isCompleted: Math.random() > 0.7, // Randomly set some as completed
      completedAt: Math.random() > 0.7 ? format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'') : null,
      completedBy: Math.random() > 0.7 ? (Math.random() > 0.5 ? 2 : 3) : null,
      dueDate: null,
      assignedUsers: templateTask.assignToAll
        ? [
            { userId: 2, firstName: 'John', lastName: 'Doe' },
            { userId: 3, firstName: 'Jane', lastName: 'Doe' },
          ]
        : templateTask.assignedUsers,
      createdAt: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
      updatedAt: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
    });
  }
  return tasksForTemplate;
});

// Define handlers
export const authHandlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    await delay();
    const { username, password } = await request.json() as { username: string; password: string };

    // Simple authentication logic
    if (
      (username === 'admin' && password === 'admin123') ||
      (username === 'john.doe' && password === 'password123') ||
      (username === 'jane.doe' && password === 'password123')
    ) {
      const user = users.find((u) => u.username === username);
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user,
      });
    }

    return new HttpResponse(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
  }),

  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      user: users[1], // Return John Doe as the default user
    });
  }),

  http.get('/api/auth/users', () => {
    return HttpResponse.json({ users });
  }),
];

export const householdHandlers = [
  // Households endpoints
  http.get('/api/households', () => {
    return HttpResponse.json({ households });
  }),

  http.get('/api/households/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const household = households.find((h) => h.id === id);

    if (!household) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({
      ...household,
      members: householdMembers,
      isOwner: true,
    });
  }),
];

export const handlers = [
  ...authHandlers,
  ...householdHandlers,

  // Get templates for a household
  http.get('/api/templates/household/:householdId', ({ params }) => {
    const householdId = parseInt(params.householdId as string);
    const filteredTemplates = templates.filter(t => t.householdId === householdId);
    return HttpResponse.json({ templates: filteredTemplates });
  }),

  // Get template detail by ID
  http.get('/api/templates/:id', ({ params }) => {
    const templateId = parseInt(params.id as string);
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      return new HttpResponse(null, { status: 404 });
    }

    // Get tasks for this template
    const tasks = templateTasks.filter(task => task.templateId === templateId);

    // Get household members
    const members = [
      { id: 1, firstName: 'John', lastName: 'Doe' },
      { id: 2, firstName: 'Jane', lastName: 'Smith' },
      { id: 3, firstName: 'Mike', lastName: 'Johnson' },
    ];

    // Return template detail
    const templateDetail = {
      ...template,
      tasks,
      categories: categories.filter(c => c.householdId === template.householdId),
      members,
    };

    return HttpResponse.json(templateDetail);
  }),

  // Create a new template
  http.post('/api/templates', async ({ request }) => {
    await delay();
    const data = await request.json() as { name: string; description?: string; householdId: number };

    const newTemplate = {
      id: templates.length + 1,
      name: data.name,
      description: data.description || "",  // Change null to empty string for type compatibility
      householdId: data.householdId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    templates.push(newTemplate);
    return HttpResponse.json({ template: newTemplate }, { status: 201 });
  }),

  // Add a task to a template
  http.post('/api/templates/:templateId/tasks', async ({ request, params }) => {
    await delay();
    const templateId = parseInt(params.templateId as string);
    const data = await request.json() as any;

    // Find the category for the name
    const category = categories.find(c => c.id === data.categoryId);

    const newTask = {
      id: templateTasks.length + 1,
      name: data.name,
      description: data.description || null,
      categoryId: data.categoryId,
      categoryName: category?.name || 'Unknown Category',
      templateId,
      timesPerMonth: data.timesPerMonth,
      storyPoints: data.storyPoints,
      assignToAll: data.assignToAll,
      assignedUsers: data.assignToAll ? [] : (data.assignedUserIds || []).map((userId: number) => {
        if (userId === 1) return { userId: 1, firstName: 'John', lastName: 'Doe' };
        if (userId === 2) return { userId: 2, firstName: 'Jane', lastName: 'Smith' };
        if (userId === 3) return { userId: 3, firstName: 'Mike', lastName: 'Johnson' };
        return { userId, firstName: 'User', lastName: userId.toString() };
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    templateTasks.push(newTask);
    return HttpResponse.json({ task: newTask }, { status: 201 });
  }),

  // Update a template task
  http.put('/api/templates/tasks/:taskId', async ({ request, params }) => {
    await delay();
    const taskId = parseInt(params.taskId as string);
    const data = await request.json() as any;

    const taskIndex = templateTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    // Find the category for the name
    const category = categories.find(c => c.id === data.categoryId);

    // Update the task
    const updatedTask = {
      ...templateTasks[taskIndex],
      name: data.name,
      description: data.description || null,
      categoryId: data.categoryId,
      categoryName: category?.name || 'Unknown Category',
      timesPerMonth: data.timesPerMonth,
      storyPoints: data.storyPoints,
      assignToAll: data.assignToAll,
      assignedUsers: data.assignToAll ? [] : (data.assignedUserIds || []).map((userId: number) => {
        if (userId === 1) return { userId: 1, firstName: 'John', lastName: 'Doe' };
        if (userId === 2) return { userId: 2, firstName: 'Jane', lastName: 'Smith' };
        if (userId === 3) return { userId: 3, firstName: 'Mike', lastName: 'Johnson' };
        return { userId, firstName: 'User', lastName: userId.toString() };
      }),
      updatedAt: new Date().toISOString(),
    };

    templateTasks[taskIndex] = updatedTask;
    return HttpResponse.json({ task: updatedTask });
  }),

  // Delete a template task
  http.delete('/api/templates/tasks/:taskId', ({ params }) => {
    const taskId = parseInt(params.taskId as string);

    const taskIndex = templateTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    templateTasks = templateTasks.filter(t => t.id !== taskId);
    return new HttpResponse(null, { status: 204 });
  }),

  // Get categories for a household
  http.get('/api/categories/household/:householdId', ({ params }) => {
    const householdId = parseInt(params.householdId as string);
    const filteredCategories = categories.filter(c => c.householdId === householdId);
    return HttpResponse.json({ categories: filteredCategories });
  }),

  // Create a new category
  http.post('/api/categories', async ({ request }) => {
    await delay();
    const data = await request.json() as { name: string; description?: string; householdId: number };

    const newCategory = {
      id: categories.length + 1,
      name: data.name,
      description: data.description || "",  // Change null to empty string for type compatibility
      householdId: data.householdId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    categories.push(newCategory);
    return HttpResponse.json({ category: newCategory }, { status: 201 });
  }),

  // Monthly Plans endpoints
  http.get('/api/monthly-plans/household/:householdId', ({ params }) => {
    const householdId = parseInt(params.householdId as string);
    const householdPlans = monthlyPlans.filter((p) => p.householdId === householdId);

    return HttpResponse.json({ plans: householdPlans });
  }),

  http.get('/api/monthly-plans/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const plan = monthlyPlans.find((p) => p.id === id);

    if (!plan) {
      return new HttpResponse(null, { status: 404 });
    }

    // Calculate statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.isCompleted).length;
    const totalStoryPoints = tasks.reduce((sum, task) => sum + task.storyPoints, 0);
    const completedStoryPoints = tasks
      .filter((t) => t.isCompleted)
      .reduce((sum, task) => sum + task.storyPoints, 0);

    // Stats by category
    const categoryStats = categories.map((category) => {
      const categoryTasks = tasks.filter((task) => task.categoryId === category.id);
      const categoryCompletedTasks = categoryTasks.filter((task) => task.isCompleted);

      return {
        categoryId: category.id,
        categoryName: category.name,
        totalTasks: categoryTasks.length,
        completedTasks: categoryCompletedTasks.length,
        totalStoryPoints: categoryTasks.reduce((sum, task) => sum + task.storyPoints, 0),
        completedStoryPoints: categoryCompletedTasks.reduce(
          (sum, task) => sum + task.storyPoints,
          0
        ),
      };
    });

    // Stats by user
    const userStats = householdMembers.map((member) => {
      const memberTasks = tasks.filter((task) => {
        return task.assignedUsers.some((user) => user.userId === member.id);
      });

      const memberCompletedTasks = memberTasks.filter((task) => task.isCompleted);

      return {
        userId: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        totalTasks: memberTasks.length,
        completedTasks: memberCompletedTasks.length,
        totalStoryPoints: memberTasks.reduce((sum, task) => sum + task.storyPoints, 0),
        completedStoryPoints: memberCompletedTasks.reduce(
          (sum, task) => sum + task.storyPoints,
          0
        ),
      };
    });

    return HttpResponse.json({
      ...plan,
      tasks,
      categories,
      members: householdMembers,
      stats: {
        totalTasks,
        completedTasks,
        totalStoryPoints,
        completedStoryPoints,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        storyPointCompletionRate:
          totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0,
        categoryStats,
        userStats,
        previousMonth: null, // No previous month in the mock data
      },
    });
  }),

  // Task completion endpoint
  http.patch('/api/monthly-plans/tasks/:taskId/complete', async ({ params, request }) => {
    const taskId = parseInt(params.taskId as string);
    const { isCompleted } = await request.json() as { isCompleted: boolean };
    const task = tasks.find((t) => t.id === taskId);

    if (!task) {
      return new HttpResponse(null, { status: 404 });
    }

    // Update the task
    task.isCompleted = isCompleted;
    task.completedAt = isCompleted ? format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'') : null;
    task.completedBy = isCompleted ? 2 : null; // Assume John Doe is completing

    return HttpResponse.json({ task });
  }),

  // New task completion endpoint
  http.put('/api/tasks/:id/complete', async ({ request, params }) => {
    await delay();
    const { isCompleted } = await request.json() as { isCompleted: boolean };

    const taskId = parseInt(params.id as string);
    const task = tasks.find((t) => t.id === taskId);

    if (!task) {
      return new HttpResponse(null, { status: 404 });
    }

    // Update the task
    task.isCompleted = isCompleted;
    task.completedAt = isCompleted ? format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'') : null;
    task.completedBy = isCompleted ? 2 : null; // Assume John Doe is completing

    return HttpResponse.json({ task });
  }),
];

// Add the template handlers to the main handlers array
export const allHandlers = [...handlers];
