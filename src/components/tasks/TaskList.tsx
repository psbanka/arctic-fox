import type { Task } from '../../../shared/types';
import { XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TaskGroup {
  name: string;
  description: string | null;
  count: number;
  totalStoryPoints: number;
  dueDate: string | null;
  assignedUsers: {
    userId: number;
    firstName: string;
    lastName: string;
  }[];
  categoryId: number;
  categoryName: string;
  isCompleted: boolean;
}

interface CategoryGroup {
  categoryId: number;
  categoryName: string;
  taskGroups: TaskGroup[];
}

export function TaskList({ tasks, isPlanClosed, onToggleTaskCompletion }: { tasks: Task[]; isPlanClosed?: boolean; onToggleTaskCompletion?: (task: Task) => void }) {
  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    const categoryId = task.categoryId;
    if (!acc[categoryId]) {
      acc[categoryId] = {
        tasks: [],
        categoryName: task.categoryName,
      };
    }
    acc[categoryId].tasks.push(task);
    return acc;
  }, {} as Record<number, { tasks: Task[]; categoryName: string }>);

  // For each category, group tasks by name
  const groupedTasks: CategoryGroup[] = Object.entries(tasksByCategory).map(([categoryId, { tasks: categoryTasks, categoryName }]) => {
    const taskGroups = categoryTasks.reduce((acc: Record<string, TaskGroup>, task: Task) => {
      const name = task.name;
      if (!acc[name]) {
        acc[name] = {
          name,
          description: task.description,
          count: 0,
          totalStoryPoints: 0,
          dueDate: task.dueDate,
          assignedUsers: [],
          categoryId: Number.parseInt(categoryId, 10),
          categoryName,
          isCompleted: task.isCompleted,
        };
      }
      acc[name].count++;
      acc[name].totalStoryPoints += task.storyPoints;
      for (const user of task.assignedUsers) {
        if (!acc[name].assignedUsers.some((u) => u.userId === user.userId)) {
          acc[name].assignedUsers.push(user);
        }
      }
      if (task.dueDate && (!acc[name].dueDate || new Date(task.dueDate) < new Date(acc[name].dueDate))) {
        acc[name].dueDate = task.dueDate;
      }
      return acc;
    }, {});

    return {
      categoryId: Number.parseInt(categoryId, 10),
      categoryName,
      taskGroups: Object.values(taskGroups),
    };
  });

  return (
    <>
      {groupedTasks.map(({ categoryId, taskGroups }) => (
        <div key={`category-${categoryId}`} className="mb-8">
          <div className="space-y-4">
            {taskGroups.map((group) => (
              <div key={`${categoryId}-${group.name}`} className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      className={`p-2 rounded-full ${group.isCompleted ? 'text-green-500' : 'text-gray-400'}`}
                      onClick={() => !isPlanClosed && onToggleTaskCompletion?.({
                        id: 0, // We don't have the original task ID in the group
                        name: group.name,
                        description: group.description,
                        categoryId: group.categoryId,
                        categoryName: group.categoryName,
                        storyPoints: group.totalStoryPoints,
                        isTemplateTask: false,
                        isCompleted: group.isCompleted,
                        completedAt: null,
                        completedBy: null,
                        dueDate: group.dueDate,
                        assignedUsers: group.assignedUsers,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      })}
                      disabled={isPlanClosed}
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                    <div>
                      <div className="font-medium">
                        {group.name} {group.count}
                        <span className="ml-2 text-sm text-gray-500">({group.count} tasks)</span>
                      </div>
                      <div className="text-sm text-gray-500">{group.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{group.totalStoryPoints} points</span>
                    {group.dueDate && (
                      <span className="text-sm text-gray-500">Due: {format(new Date(group.dueDate), 'MMM d')}</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.assignedUsers.map((user) => (
                    <span
                      key={`${categoryId}-${group.name}-${user.userId}`}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {user.firstName} {user.lastName}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
} 