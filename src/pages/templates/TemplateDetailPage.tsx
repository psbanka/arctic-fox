import type { FC } from 'react';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  PlusCircle,
  Trash2,
  Edit,
  ArrowLeft,
  Users,
  Clock,
  Star
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import type {
  TemplateTask,
  Category
} from '@shared/types';

// Form validation schema for creating a task
const createTaskSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  categoryId: z.number().positive('Please select a category'),
  timesPerMonth: z
    .number()
    .min(1, 'Times per month must be at least 1')
    .max(31, 'Times per month cannot exceed 31'),
  storyPoints: z
    .number()
    .min(1, 'Story points must be at least 1')
    .max(100, 'Story points cannot exceed 100'),
  assignToAll: z.boolean(),
  assignedUserIds: z.array(z.number()).optional(),
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

const TemplateDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TemplateTask | null>(null);

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: 0,
      timesPerMonth: 1,
      storyPoints: 1,
      assignToAll: false,
      assignedUserIds: [],
    },
  });

  const assignToAll = watch('assignToAll');

  // Fetch template details
  const {
    data: template,
    isLoading: isLoadingTemplate,
    refetch: refetchTemplate,
  } = useQuery({
    queryKey: ['template', id],
    queryFn: () => (id ? api.templates.getById(parseInt(id)) : Promise.reject('No ID provided')),
    enabled: !!id,
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: (data: CreateTaskFormData) => {
      if (!id) return Promise.reject('No template ID');
      const templateId = parseInt(id);

      if (editingTask) {
        // Update existing task - ensure description is a string or undefined, never null
        return api.templates.updateTask(editingTask.id, {
          ...data,
          description: data.description || "",
        });
      } else {
        // Create new task - ensure description is a string or undefined, never null
        return api.templates.addTask(templateId, {
          ...data,
          description: data.description ?? "",
        });
      }
    },
    onSuccess: () => {
      toast.success(editingTask ? 'Task updated successfully!' : 'Task added successfully!');
      setIsTaskModalOpen(false);
      setEditingTask(null);
      reset();
      refetchTemplate();
    },
    onError: (error) => {
      toast.error(editingTask ? 'Failed to update task' : 'Failed to add task');
      console.error('Task mutation error:', error);
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => api.templates.deleteTask(taskId),
    onSuccess: () => {
      toast.success('Task deleted successfully!');
      refetchTemplate();
    },
    onError: (error) => {
      toast.error('Failed to delete task');
      console.error('Delete task error:', error);
    },
  });

  const handleAddTask = (data: CreateTaskFormData) => {
    addTaskMutation.mutate(data);
  };

  const handleEditTask = (task: TemplateTask) => {
    setEditingTask(task);
    setValue('name', task.name);
    setValue('description', task.description);
    setValue('categoryId', task.categoryId);
    setValue('timesPerMonth', task.timesPerMonth);
    setValue('storyPoints', task.storyPoints);
    setValue('assignToAll', task.assignToAll);
    setValue('assignedUserIds', task.assignedUsers.map((user) => user.userId));
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = (taskId: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const openTaskModal = () => {
    reset({
      name: '',
      description: '',
      categoryId: 0,
      timesPerMonth: 1,
      storyPoints: 1,
      assignToAll: false,
      assignedUserIds: [],
    });
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  if (isLoadingTemplate) {
    return <LoadingSpinner />;
  }

  if (!template) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Template not found</p>
        <Button onClick={() => navigate('/templates')} className="mt-4">
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="outline"
          className="mb-4 flex items-center"
          onClick={() => navigate('/templates')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{template.name}</h1>
            {template.description && (
              <p className="text-gray-600 mt-1">{template.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Categories and Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Categories</h2>
          {template.categories.length > 0 ? (
            <ul className="space-y-2">
              {template.categories.map((category) => (
                <li key={category.id} className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                  {category.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No categories available</p>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Household Members</h2>
          {template.members.length > 0 ? (
            <ul className="space-y-2">
              {template.members.map((member) => (
                <li key={member.id} className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                    {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                  </div>
                  {member.firstName} {member.lastName}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No members available</p>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Tasks</h2>
          <Button onClick={openTaskModal} className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>

        {template.tasks.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {template.tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{task.name}</div>
                      {task.description && (
                        <div className="text-xs text-gray-500">{task.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.categoryName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-500" />
                        {task.timesPerMonth}x / month
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 mr-1 text-yellow-500" />
                        {task.storyPoints}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.assignToAll ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Users className="h-3 w-3 mr-1" />
                          All Members
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {task.assignedUsers.map((user) => (
                            <span key={user.userId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {user.firstName} {user.lastName}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleEditTask(task)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 border rounded-lg">
            <p className="text-gray-500 mb-4">No tasks have been added to this template yet</p>
            <Button onClick={openTaskModal}>
              Add your first task
            </Button>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </h2>
            <form onSubmit={handleSubmit(handleAddTask)}>
              {/* Name input */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Task Name</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Clean Kitchen"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Description input */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <textarea
                  {...register('description')}
                  className="w-full p-2 border rounded-md"
                  placeholder="Describe the task"
                  rows={2}
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Category select */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  {...register('categoryId', { valueAsNumber: true })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a category</option>
                  {template.categories.map((category: Category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
                )}
              </div>

              {/* Times per month input */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Times Per Month
                  <span className="text-xs text-gray-500 ml-2">(How many times this task should be done)</span>
                </label>
                <Controller
                  name="timesPerMonth"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      className="w-full p-2 border rounded-md"
                      min={1}
                      max={31}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      value={field.value}
                    />
                  )}
                />
                {errors.timesPerMonth && (
                  <p className="text-red-500 text-xs mt-1">{errors.timesPerMonth.message}</p>
                )}
              </div>

              {/* Story points input */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Story Points
                  <span className="text-xs text-gray-500 ml-2">(Effort estimation)</span>
                </label>
                <Controller
                  name="storyPoints"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      className="w-full p-2 border rounded-md"
                      min={1}
                      max={100}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      value={field.value}
                    />
                  )}
                />
                {errors.storyPoints && (
                  <p className="text-red-500 text-xs mt-1">{errors.storyPoints.message}</p>
                )}
              </div>

              {/* Assign to all checkbox */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('assignToAll')}
                    className="h-4 w-4 text-blue-600 mr-2"
                  />
                  <span className="text-sm font-medium">Assign to all household members</span>
                </label>
              </div>

              {/* Assigned users multi-select */}
              {!assignToAll && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Assign To</label>
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                    {template.members.map((member) => (
                      <label key={member.id} className="flex items-center mb-2">
                        <Controller
                          name="assignedUserIds"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 mr-2"
                              checked={(field.value || []).includes(member.id)}
                              onChange={(e) => {
                                const currentValues = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([...currentValues, member.id]);
                                } else {
                                  field.onChange(currentValues.filter((id) => id !== member.id));
                                }
                              }}
                            />
                          )}
                        />
                        <span>{member.firstName} {member.lastName}</span>
                      </label>
                    ))}
                  </div>
                  {errors.assignedUserIds && (
                    <p className="text-red-500 text-xs mt-1">{errors.assignedUserIds.message}</p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsTaskModalOpen(false);
                    setEditingTask(null);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={addTaskMutation.isPending}
                >
                  {editingTask ? 'Update Task' : 'Add Task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateDetailPage;
