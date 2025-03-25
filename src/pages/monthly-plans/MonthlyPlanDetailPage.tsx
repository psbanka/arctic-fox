import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Clock,
  Star,
  CheckCircle2,
  XCircle,
  BarChart3,
  Users,
  User as UserIcon,
  CheckSquare,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Task } from '@shared/types';

const MonthlyPlanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  // Fetch monthly plan details
  const {
    data: plan,
    isLoading: isLoadingPlan,
  } = useQuery({
    queryKey: ['monthlyPlan', id],
    queryFn: () => (id ? api.monthlyPlans.getById(parseInt(id)) : Promise.reject('No ID provided')),
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
      closePlanMutation.mutate(parseInt(id));
    }
  };

  // Apply filters to tasks
  const getFilteredTasks = () => {
    if (!plan || !plan.tasks) return [];

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

  // Group tasks by category, then by title and owner
  const getTasksByCategory = () => {
    const filteredTasks = getFilteredTasks();

    // First group by category
    const tasksByCategory = filteredTasks.reduce<Record<number, Task[]>>((acc, task) => {
      if (!acc[task.categoryId]) {
        acc[task.categoryId] = [];
      }
      acc[task.categoryId].push(task);
      return acc;
    }, {});

    // Then for each category, group tasks by title and owner
    const groupedTasksByCategory: Record<number, Record<string, Task[]>> = {};

    Object.entries(tasksByCategory).forEach(([categoryId, tasks]) => {
      const numCategoryId = parseInt(categoryId);
      groupedTasksByCategory[numCategoryId] = {};

      tasks.forEach(task => {
        // Create a unique key for each combination of task title and assigned user
        task.assignedUsers.forEach(user => {
          const groupKey = `${task.name}-${user.userId}`;

          if (!groupedTasksByCategory[numCategoryId][groupKey]) {
            groupedTasksByCategory[numCategoryId][groupKey] = [];
          }

          groupedTasksByCategory[numCategoryId][groupKey].push(task);
        });

        // Handle tasks with no assignees
        if (task.assignedUsers.length === 0) {
          const groupKey = `${task.name}-unassigned`;

          if (!groupedTasksByCategory[numCategoryId][groupKey]) {
            groupedTasksByCategory[numCategoryId][groupKey] = [];
          }

          groupedTasksByCategory[numCategoryId][groupKey].push(task);
        }
      });
    });

    return groupedTasksByCategory;
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    if (!plan || !plan.categories) return 'Unknown';
    const category = plan.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  // Get category completion data
  const getCategoryCompletionData = (categoryId: number) => {
    if (!plan || !plan.stats || !plan.stats.categoryStats) return null;

    const categoryStat = plan.stats.categoryStats.find(c => c.categoryId === categoryId);
    if (!categoryStat) return null;

    return {
      ...categoryStat,
      completionRate: categoryStat.totalTasks > 0 ?
        (categoryStat.completedTasks / categoryStat.totalTasks) * 100 : 0
    };
  };

  if (isLoadingPlan) {
    return <LoadingSpinner />;
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Monthly plan not found</p>
        <Button onClick={() => navigate('/monthly-plans')} className="mt-4">
          Back to Monthly Plans
        </Button>
      </div>
    );
  }

  const tasksByCategory = getTasksByCategory();

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
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
            <div className="mt-2 flex justify-between items-baseline">
              <p className="text-2xl font-semibold">
                {plan.stats.completionRate.toFixed(0)}%
              </p>
              <div className="text-sm text-gray-500">
                {plan.stats.completedTasks}/{plan.stats.totalTasks} tasks
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${plan.stats.completionRate}%` }}
              />
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Story Points</h3>
            <div className="mt-2 flex justify-between items-baseline">
              <p className="text-2xl font-semibold">
                {plan.stats.storyPointCompletionRate.toFixed(0)}%
              </p>
              <div className="text-sm text-gray-500">
                {plan.stats.completedStoryPoints}/{plan.stats.totalStoryPoints} points
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-purple-600 h-2.5 rounded-full"
                style={{ width: `${plan.stats.storyPointCompletionRate}%` }}
              />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Total Categories</h3>
            <p className="mt-2 text-2xl font-semibold">
              {plan.categories.length}
            </p>
            <div className="mt-2 text-sm text-gray-500">
              {plan.stats.categoryStats.map(cat => cat.categoryName).slice(0, 3).join(', ')}
              {plan.stats.categoryStats.length > 3 && '...'}
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Members Assigned</h3>
            <p className="mt-2 text-2xl font-semibold">
              {plan.members.length}
            </p>
            <div className="mt-2 text-sm text-gray-500">
              {plan.members.map(member => `${member.firstName} ${member.lastName}`).slice(0, 2).join(', ')}
              {plan.members.length > 2 && '...'}
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3 flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Member Contributions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.stats.userStats.map(userStat => {
              const completionRate = userStat.totalTasks > 0 ?
                (userStat.completedTasks / userStat.totalTasks) * 100 : 0;

              return (
                <div
                  key={userStat.userId}
                  className="border p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setFilterAssignee(
                    filterAssignee === userStat.userId ? null : userStat.userId
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center mr-2">
                        <span>{userStat.firstName.charAt(0)}{userStat.lastName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{userStat.firstName} {userStat.lastName}</p>
                        <p className="text-xs text-gray-500">{userStat.completedTasks} of {userStat.totalTasks} tasks</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{completionRate.toFixed(0)}%</p>
                      <p className="text-xs text-gray-500">{userStat.completedStoryPoints} pts</p>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        completionRate >= 75 ? 'bg-green-500' :
                        completionRate >= 50 ? 'bg-blue-500' :
                        completionRate >= 25 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Stats */}
        <div>
          <h3 className="text-md font-medium mb-3">Category Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.stats.categoryStats.map(catStat => {
              const completionRate = catStat.totalTasks > 0 ?
                (catStat.completedTasks / catStat.totalTasks) * 100 : 0;

              return (
                <div
                  key={catStat.categoryId}
                  className="border p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setFilterCategory(
                    filterCategory === catStat.categoryId ? null : catStat.categoryId
                  )}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{catStat.categoryName}</p>
                    <p className="text-sm">{completionRate.toFixed(0)}% complete</p>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        completionRate >= 75 ? 'bg-green-500' :
                        completionRate >= 50 ? 'bg-blue-500' :
                        completionRate >= 25 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 flex justify-between">
                    <span>{catStat.completedTasks} of {catStat.totalTasks} tasks</span>
                    <span>{catStat.completedStoryPoints} of {catStat.totalStoryPoints} points</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold">Tasks</h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Category filter */}
            <select
              className="p-2 border rounded-md"
              value={filterCategory || ''}
              onChange={(e) => setFilterCategory(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All Categories</option>
              {plan.categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Assignee filter */}
            <select
              className="p-2 border rounded-md"
              value={filterAssignee || ''}
              onChange={(e) => setFilterAssignee(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All Members</option>
              {plan.members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>

            {/* Completion status filter */}
            <label className="flex items-center p-2 border rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={() => setShowCompleted(!showCompleted)}
                className="h-4 w-4 mr-2"
              />
              <span>Show Completed</span>
            </label>
          </div>
        </div>

        {/* Tasks grouped by category */}
        <div className="space-y-6">
          {Object.keys(tasksByCategory).length > 0 ? (
            Object.entries(tasksByCategory).map(([categoryId, taskGroups]) => (
              <div key={categoryId} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-4 flex justify-between items-center">
                  <h3 className="font-medium">{getCategoryName(parseInt(categoryId))}</h3>

                  {getCategoryCompletionData(parseInt(categoryId)) && (
                    <div className="text-sm">
                      {getCategoryCompletionData(parseInt(categoryId))?.completedTasks} of {getCategoryCompletionData(parseInt(categoryId))?.totalTasks} tasks completed
                    </div>
                  )}
                </div>

                <div className="divide-y">
                  {Object.entries(taskGroups).map(([groupKey, tasks]) => {
                    // Get the first task in the group to display the common information
                    const firstTask = tasks[0];
                    // Get the user information if this is a user-assigned group
                    const assigneeInfo = firstTask.assignedUsers[0];
                    const isUnassigned = !assigneeInfo;

                    return (
                      <div key={groupKey} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mt-1 mr-3">
                              {tasks.length > 1 ? (
                                <div className="relative">
                                  {/* Stacked task icons for groups */}
                                  <div className="absolute -top-1 -left-1 w-5 h-5 border border-white bg-gray-100 rounded-md"></div>
                                  <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border border-white bg-gray-100 rounded-md"></div>
                                  <button
                                    className={`relative w-5 h-5 flex items-center justify-center rounded-md ${
                                      tasks.every(t => t.isCompleted) ? 'text-green-500 bg-green-100' : 'text-gray-300 bg-gray-100'
                                    }`}
                                    onClick={() => !plan.isClosed && handleToggleTaskCompletion(firstTask)}
                                    disabled={plan.isClosed}
                                  >
                                    {tasks.every(t => t.isCompleted) ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className={`flex-shrink-0 ${firstTask.isCompleted ? 'text-green-500' : 'text-gray-300'}`}
                                  onClick={() => !plan.isClosed && handleToggleTaskCompletion(firstTask)}
                                  disabled={plan.isClosed}
                                >
                                  {firstTask.isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    <XCircle className="h-5 w-5" />
                                  )}
                                </button>
                              )}
                            </div>

                            <div>
                              <h4 className={`font-medium ${tasks.every(t => t.isCompleted) ? 'line-through text-gray-500' : ''}`}>
                                {firstTask.name}
                                {tasks.length > 1 && <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">{tasks.length}</span>}
                              </h4>
                              {firstTask.description && (
                                <p className={`text-sm mt-1 ${tasks.every(t => t.isCompleted) ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {firstTask.description}
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                  <Star className="h-3 w-3 mr-1" />
                                  {tasks.reduce((total, task) => total + task.storyPoints, 0)} points
                                </span>

                                {assigneeInfo && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                    <UserIcon className="h-3 w-3 mr-1" />
                                    {`${assigneeInfo.firstName} ${assigneeInfo.lastName}`}
                                  </span>
                                )}

                                {isUnassigned && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                    <UserIcon className="h-3 w-3 mr-1" />
                                    Unassigned
                                  </span>
                                )}

                                {tasks.every(t => t.isCompleted) && tasks[0].completedAt && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {format(new Date(tasks[0].completedAt), 'MMM d')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {tasks.every(t => t.isCompleted) && tasks[0].completedBy && (
                            <div className="text-xs text-gray-500 flex items-center">
                              <span>Completed by</span>
                              <div className="ml-1 bg-gray-200 rounded-full h-6 w-6 flex items-center justify-center text-xs">
                                {plan.members.find(m => m.id === tasks[0].completedBy)?.firstName.charAt(0)}
                                {plan.members.find(m => m.id === tasks[0].completedBy)?.lastName.charAt(0)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-gray-500">No tasks match your filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setFilterCategory(null);
                  setFilterAssignee(null);
                  setShowCompleted(true);
                }}
                className="mt-2"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyPlanDetailPage;
