import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskList } from '../TaskList';
import type { Task } from '../../../../shared/types';

describe('TaskList', () => {
  const mockTasks: Task[] = [
    {
      id: 1,
      name: 'Test Task 1',
      description: 'Test Description',
      categoryId: 1,
      categoryName: 'Test Category',
      storyPoints: 5,
      isTemplateTask: false,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      dueDate: null,
      assignedUsers: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 2,
      name: 'Test Task 1', // Same name as above to test grouping
      description: 'Test Description',
      categoryId: 1,
      categoryName: 'Test Category',
      storyPoints: 3,
      isTemplateTask: false,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      dueDate: null,
      assignedUsers: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const mockOnToggleTaskCompletion = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use the first task ID when toggling task completion for grouped tasks', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onToggleTaskCompletion={mockOnToggleTaskCompletion}
      />
    );

    // Find and click the completion button for the grouped task
    const completionButton = screen.getByRole('button', { name: /Toggle completion for Test Task 1/i });
    fireEvent.click(completionButton);

    // Verify that the callback was called with the first task ID (1)
    expect(mockOnToggleTaskCompletion).toHaveBeenCalledTimes(1);
    expect(mockOnToggleTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1, // Should use the first task ID
        name: 'Test Task 1',
        description: 'Test Description',
        categoryId: 1,
        categoryName: 'Test Category',
        storyPoints: 8, // Combined story points
        isCompleted: false,
        isTemplateTask: false,
        completedAt: null,
        completedBy: null,
        dueDate: null,
        assignedUsers: [],
      })
    );
  });
}); 