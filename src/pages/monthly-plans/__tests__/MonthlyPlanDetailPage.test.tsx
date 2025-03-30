import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MonthlyPlanDetailPage from '../MonthlyPlanDetailPage';
import type { Task } from '@shared/types';
import '../../../test/setup';

// Mock the API
vi.mock('../../../services/api', () => ({
  default: {
    monthlyPlans: {
      getById: vi.fn(),
      completeTask: vi.fn(),
      closePlan: vi.fn(),
    },
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => vi.fn(),
}));

const mockTasks: Task[] = [
  {
    id: 1,
    name: 'Clean the kitchen',
    description: 'Clean all surfaces',
    categoryId: 1,
    categoryName: 'Household',
    storyPoints: 2,
    isCompleted: false,
    isTemplateTask: false,
    dueDate: '2024-03-20',
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01',
    completedAt: null,
    completedBy: null,
    assignedUsers: [
      { userId: 1, firstName: 'John', lastName: 'Doe' },
    ],
  },
  {
    id: 2,
    name: 'Clean the kitchen',
    description: 'Clean all surfaces',
    categoryId: 1,
    categoryName: 'Household',
    storyPoints: 3,
    isCompleted: false,
    isTemplateTask: false,
    dueDate: '2024-03-19',
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01',
    completedAt: null,
    completedBy: null,
    assignedUsers: [
      { userId: 2, firstName: 'Jane', lastName: 'Smith' },
    ],
  },
  {
    id: 3,
    name: 'Clean the kitchen',
    description: 'Clean all surfaces',
    categoryId: 1,
    categoryName: 'Household',
    storyPoints: 2,
    isCompleted: false,
    isTemplateTask: false,
    dueDate: '2024-03-21',
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01',
    completedAt: null,
    completedBy: null,
    assignedUsers: [
      { userId: 1, firstName: 'John', lastName: 'Doe' },
    ],
  },
];

const mockPlanResult = {
  plan: {
    id: 1,
    name: 'March 2024',
    year: 2024,
    month: 3,
    isClosed: false,
  },
  tasks: mockTasks,
  categories: [
    { id: 1, name: 'Household' },
  ],
  members: [
    { id: 1, firstName: 'John', lastName: 'Doe' },
    { id: 2, firstName: 'Jane', lastName: 'Smith' },
  ],
  stats: {
    totalTasks: 3,
    completedTasks: 0,
    totalStoryPoints: 7,
    completedStoryPoints: 0,
  },
};

describe('MonthlyPlanDetailPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should group duplicate tasks correctly', async () => {
    // Mock the API response
    const api = (await import('../../../services/api')).default;
    (api.monthlyPlans.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockPlanResult);

    render(
      <QueryClientProvider client={queryClient}>
        <MonthlyPlanDetailPage />
      </QueryClientProvider>
    );

    // Wait for the tasks to load and verify the task name is shown
    const taskElement = await screen.findByText(/Clean the kitchen/);
    expect(taskElement).toBeInTheDocument();
    
    // Verify that the count is shown correctly
    expect(screen.getByText(/\(3 tasks\)/)).toBeInTheDocument();
    
    // Verify that the total story points are combined
    const pointsElements = screen.getAllByText(/7 points/);
    expect(pointsElements).toHaveLength(2); // One in summary, one in task details
    
    // Verify that all assigned users are shown
    const assigneeTags = screen.getAllByText(/John Doe|Jane Smith/, { selector: '.bg-blue-100' });
    expect(assigneeTags).toHaveLength(2); // 2 for John Doe, 1 for Jane Smith
  });
}); 