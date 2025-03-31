import { type FC, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Clock,
  BarChart3,
  CheckSquare,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { TaskList } from '../../components/tasks/TaskList';
import type { Task } from '@shared/types';

const MonthlyPlanDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  // Fetch monthly plan details
  const {
    data: planResult,
    isLoading: isLoadingPlan,
  } = useQuery({
    queryKey: ['monthlyPlan', id],
    queryFn: () => (id ? api.monthlyPlans.getById(Number.parseInt(id)) : Promise.reject('No ID provided')),
    enabled: !!id,
  });

  // Task completion mutation
  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, isCompleted }: { taskId: number; isCompleted: boolean }) =>
      api.monthlyPlans.completeTask(taskId, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyPlan', id] });
      toast.success('Task updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update task');
      console.error('Task completion error:', error);
    },
  });

  // Close plan mutation
  const closePlanMutation = useMutation({
    mutationFn: (planId: number) => api.monthlyPlans.closePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyPlan', id] });
      queryClient.invalidateQueries({ queryKey: ['monthlyPlans'] });
      toast.success('Plan closed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to close plan');
      console.error('Close plan error:', error);
    },
  });

  const handleToggleTaskCompletion = (task: Task) => {
    completeTaskMutation.mutate({
      taskId: task.id,
      isCompleted: !task.isCompleted,
    });
  };

  const handleClosePlan = () => {
    if (!id) return;

    if (window.confirm('Are you sure you want to close this plan? This action cannot be undone.')) {
      closePlanMutation.mutate(Number.parseInt(id));
    }
  };

  // Apply filters to tasks
  const getFilteredTasks = () => {
    if (!planResult) return [];
    const plan = planResult;
    if (!plan.tasks) return [];

    return plan.tasks.filter(task => {
      // Category filter
      if (filterCategory !== null && task.categoryId !== filterCategory) {
        return false;
      }

      // Assignee filter
      if (filterAssignee !== null && !task.assignedUsers.some(u => u.userId === filterAssignee)) {
        return false;
      }

      // Completion status filter
      if (!showCompleted && task.isCompleted) {
        return false;
      }

      return true;
    });
  };

  // Group tasks by category
  const getTasksByCategory = () => {
    const filteredTasks = getFilteredTasks();

    // Group by category
    const tasksByCategory = filteredTasks.reduce<Record<number, Task[]>>((acc, task) => {
      if (!acc[task.categoryId]) {
        acc[task.categoryId] = [];
      }
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      acc[task.categoryId]!.push(task);
      return acc;
    }, {});

    return tasksByCategory;
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    if (!planResult) return 'Unknown';
    const plan = planResult;
    if (!plan.categories) return 'Unknown';
    const category = plan.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  if (isLoadingPlan) {
    return <LoadingSpinner />;
  }

  if (!planResult) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Monthly plan not found</p>
        <Button onClick={() => navigate('/monthly-plans')} className="mt-4">
          Back to Monthly Plans
        </Button>
      </div>
    );
  }

  const plan = planResult.plan;
  const tasksByCategory = getTasksByCategory();
  const completionRate = planResult.stats.completedTasks / planResult.stats.totalTasks;
  const storyPointCompletionRate = planResult.stats.completedStoryPoints / planResult.stats.totalStoryPoints;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="outline"
          className="mb-4 flex items-center"
          onClick={() => navigate('/monthly-plans')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Monthly Plans
        </Button>

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{plan.name}</h1>
            <p className="text-gray-600 mt-1">
              {format(new Date(plan.year, plan.month - 1), 'MMMM yyyy')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-sm flex items-center ${plan.isClosed ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
              {plan.isClosed ? (
                <>
                  <CheckSquare className="mr-1 h-4 w-4" />
                  Closed
                </>
              ) : (
                <>
                  <Clock className="mr-1 h-4 w-4" />
                  Active
                </>
              )}
            </span>

            {!plan.isClosed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClosePlan}
                isLoading={closePlanMutation.isPending}
              >
                Close Plan
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="mr-2 h-5 w-5 text-blue-500" />
          Summary
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Task Completion */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Task Completion</span>
              <span className="text-sm font-medium">
                {completionRate.toFixed(0)}%
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {planResult.stats.completedTasks}/{planResult.stats.totalTasks} tasks
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Story Point Completion */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Story Point Completion</span>
              <span className="text-sm font-medium">
                {storyPointCompletionRate.toFixed(0)}%
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {planResult.stats.completedStoryPoints}/{planResult.stats.totalStoryPoints} points
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${storyPointCompletionRate}%` }}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Categories</span>
              <span className="text-sm font-medium">
                {planResult.categories.length}
              </span>
            </div>
            {/* TODO: Get category completion data
            <div className="text-sm text-gray-600 truncate">
              {planResult.stats.categoryStats.map(cat => cat.categoryName).slice(0, 3).join(', ')}
              {planResult.stats.categoryStats.length > 3 && '...'}
            </div>
            */}
          </div>

          {/* Members */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Members</span>
              <span className="text-sm font-medium">
                {planResult.members.length}
              </span>
            </div>
            <div className="text-sm text-gray-600 truncate">
              {planResult.members.map(member => `${member.firstName} ${member.lastName}`).slice(0, 2).join(', ')}
              {planResult.members.length > 2 && '...'}
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Member Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/*
            TODO
            planResult.stats.userStats.map(userStat => {
              const completionRate = userStat.totalTasks > 0 ?
                (userStat.completedTasks / userStat.totalTasks) * 100 : 0;
              const storyPointRate = userStat.totalStoryPoints > 0 ?
                (userStat.completedStoryPoints / userStat.totalStoryPoints) * 100 : 0;

              return (
                <div key={userStat.userId} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <UserIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium">
                      {userStat.firstName} {userStat.lastName}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {userStat.completedTasks}/{userStat.totalTasks} tasks
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    {userStat.completedStoryPoints}/{userStat.totalStoryPoints} points
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${storyPointRate}%` }}
                    />
                  </div>
                </div>
              );
            })*/}
          </div>
        </div>

        {/* Category Stats */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Category Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* TODO
            planResult.stats.categoryStats.map(catStat => {
              const completionRate = catStat.totalTasks > 0 ?
                (catStat.completedTasks / catStat.totalTasks) * 100 : 0;
              const storyPointRate = catStat.totalStoryPoints > 0 ?
                (catStat.completedStoryPoints / catStat.totalStoryPoints) * 100 : 0;

              return (
                <div key={catStat.categoryId} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Star className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium">
                      {catStat.categoryName}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {catStat.completedTasks}/{catStat.totalTasks} tasks
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    {catStat.completedStoryPoints}/{catStat.totalStoryPoints} points
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${storyPointRate}%` }}
                    />
                  </div>
                </div>
              );
            })*/}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category-filter"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filterCategory || ''}
              onChange={(e) => setFilterCategory(e.target.value ? Number.parseInt(e.target.value) : null)}
            >
              <option value="">All Categories</option>
              {planResult.categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="assignee-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Assignee
            </label>
            <select
              id="assignee-filter"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filterAssignee || ''}
              onChange={(e) => setFilterAssignee(e.target.value ? Number.parseInt(e.target.value) : null)}
            >
              <option value="">All Assignees</option>
              {planResult.members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Completed Tasks</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Tasks</h2>
        {Object.entries(tasksByCategory).map(([categoryId, tasks]) => (
          <div key={categoryId} className="mb-8">
            <h3 className="text-md font-medium mb-4">{getCategoryName(Number.parseInt(categoryId))}</h3>
            <TaskList
              tasks={tasks}
              isPlanClosed={plan.isClosed}
              onToggleTaskCompletion={handleToggleTaskCompletion}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyPlanDetailPage;
