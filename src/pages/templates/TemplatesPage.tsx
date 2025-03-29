import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { PlusCircle, ClipboardList } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import type { Template, Household } from '@shared/types';
import { useAuth } from '../../contexts/AuthContext';

// Form validation schema for creating a template
const createTemplateSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  householdId: z.number().positive('Please select a household'),
});

type CreateTemplateFormData = z.infer<typeof createTemplateSchema>;

const TemplatesPage: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<number | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateTemplateFormData>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      householdId: 0,
    },
  });

  // Fetch households (only needed for admin users)
  const { data: households, isLoading: isLoadingHouseholds } = useQuery({
    queryKey: ['households'],
    queryFn: api.households.getAll,
    enabled: user?.isAdmin || false,
  });

  // Set the default household ID when the user data is available
  useEffect(() => {
    if (user && !user.isAdmin && user.defaultHouseholdId) {
      setSelectedHouseholdId(user.defaultHouseholdId);
    }
  }, [user]);

  // Fetch templates based on selected household
  const {
    data: templates,
    isLoading: isLoadingTemplates,
  } = useQuery({
    queryKey: ['templates', selectedHouseholdId],
    queryFn: () =>
      selectedHouseholdId
        ? api.templates.getByHousehold(selectedHouseholdId)
        : Promise.resolve([]),
    enabled: !!selectedHouseholdId,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (data: CreateTemplateFormData) =>
      api.templates.create(data.name, data.description || null, data.householdId),
    onSuccess: () => {
      toast.success('Template created successfully!');
      setIsModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['templates', selectedHouseholdId] });
    },
    onError: (error) => {
      toast.error('Failed to create template');
      console.error('Create template error:', error);
    },
  });

  const handleCreateTemplate = (data: CreateTemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const handleSelectHousehold = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(event.target.value);
    setSelectedHouseholdId(id || null);
  };

  const openCreateModal = () => {
    // Pre-select the user's default household if they're not an admin
    if (user && !user.isAdmin && user.defaultHouseholdId) {
      setValue('householdId', user.defaultHouseholdId);
    }
    setIsModalOpen(true);
  };

  // Show loading spinner while loading households (for admin) or checking user state
  if (user?.isAdmin && isLoadingHouseholds) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Templates</h1>
        <Button
          onClick={openCreateModal}
          className="flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Household selector - only show for admin users */}
      {user?.isAdmin && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Household</label>
          <select
            className="w-full md:w-1/2 p-2 border rounded-md"
            onChange={handleSelectHousehold}
            value={selectedHouseholdId || ''}
          >
            <option value="">Select a household</option>
            {households?.map((household: Household) => (
              <option key={household.id} value={household.id}>
                {household.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Templates list */}
      {selectedHouseholdId ? (
        isLoadingTemplates ? (
          <LoadingSpinner />
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template: Template) => (
              <div
                key={template.id}
                className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                onClick={() => navigate(`/templates/${template.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  <ClipboardList className="h-5 w-5 text-blue-500" />
                </div>
                {template.description && (
                  <p className="text-gray-600 mb-3 text-sm">{template.description}</p>
                )}
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xs text-gray-500">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No templates found for this household</p>
            <Button onClick={openCreateModal}>
              Create your first template
            </Button>
          </div>
        )
      ) : user?.isAdmin ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Please select a household to view templates</p>
        </div>
      ) : (
        <LoadingSpinner />
      )}

      {/* Create Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Template</h2>
            <form onSubmit={handleSubmit(handleCreateTemplate)}>
              {/* Household select - only show for admin users */}
              {user?.isAdmin ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Household</label>
                  <select
                    {...register('householdId', { valueAsNumber: true })}
                    className="w-full p-2 border rounded-md"
                    defaultValue={selectedHouseholdId || ''}
                  >
                    <option value="">Select a household</option>
                    {households?.map((household: Household) => (
                      <option key={household.id} value={household.id}>
                        {household.name}
                      </option>
                    ))}
                  </select>
                  {errors.householdId && (
                    <p className="text-red-500 text-xs mt-1">{errors.householdId.message}</p>
                  )}
                </div>
              ) : (
                <input
                  type="hidden"
                  {...register('householdId', { valueAsNumber: true })}
                />
              )}

              {/* Name input */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Template Name</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Monthly Chores"
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
                  placeholder="Describe the purpose of this template"
                  rows={3}
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createTemplateMutation.isPending}
                >
                  Create Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
