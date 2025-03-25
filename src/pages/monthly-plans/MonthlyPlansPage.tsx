import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { PlusCircle, CheckCircle2, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { MonthlyPlan, Template } from '@shared/types';
import { useAuth } from '../../contexts/AuthContext';

// Form validation schema for creating a monthly plan
const createMonthlyPlanSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  householdId: z.number().positive('Please select a household'),
  templateId: z.number().positive('Please select a template'),
});

type CreateMonthlyPlanFormData = z.infer<typeof createMonthlyPlanSchema>;

const MonthlyPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateMonthlyPlanFormData>({
    resolver: zodResolver(createMonthlyPlanSchema),
    defaultValues: {
      name: `${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')} Plan`,
      month: selectedMonth,
      year: selectedYear,
      householdId: 0,
      templateId: 0,
    },
  });

  // Set the default household ID when the user data is available
  useEffect(() => {
    if (user && !user.isAdmin && user.defaultHouseholdId) {
      setSelectedHouseholdId(user.defaultHouseholdId);
    }
  }, [user]);

  // Update form when selected month/year changes
  useEffect(() => {
    setValue('name', `${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')} Plan`);
    setValue('month', selectedMonth);
    setValue('year', selectedYear);
  }, [selectedMonth, selectedYear, setValue]);

  // Fetch households (only needed for admin users)
  const { data: households, isLoading: isLoadingHouseholds } = useQuery({
    queryKey: ['households'],
    queryFn: api.households.getAll,
    enabled: user?.isAdmin || false,
  });

  // Fetch monthly plans based on selected household
  const {
    data: monthlyPlans,
    isLoading: isLoadingPlans,
  } = useQuery({
    queryKey: ['monthlyPlans', selectedHouseholdId],
    queryFn: () =>
      selectedHouseholdId
        ? api.monthlyPlans.getByHousehold(selectedHouseholdId)
        : Promise.resolve([]),
    enabled: !!selectedHouseholdId,
  });

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

  // Create monthly plan mutation
  const createMonthlyPlanMutation = useMutation({
    mutationFn: (data: CreateMonthlyPlanFormData) => api.monthlyPlans.create(data),
    onSuccess: (newPlan) => {
      toast.success('Monthly plan created successfully!');
      setIsModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['monthlyPlans', selectedHouseholdId] });
      // Navigate to the new plan
      navigate(`/monthly-plans/${newPlan.id}`);
    },
    onError: (error) => {
      toast.error('Failed to create monthly plan');
      console.error('Create monthly plan error:', error);
    },
  });

  const handleCreateMonthlyPlan = (data: CreateMonthlyPlanFormData) => {
    createMonthlyPlanMutation.mutate(data);
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

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(event.target.value));
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(event.target.value));
  };

  // Group plans by year and month
  const groupedPlans = monthlyPlans ?
    monthlyPlans.reduce<Record<number, Record<number, MonthlyPlan[]>>>((acc, plan) => {
      if (!acc[plan.year]) {
        acc[plan.year] = {};
      }
      if (!acc[plan.year][plan.month]) {
        acc[plan.year][plan.month] = [];
      }
      acc[plan.year][plan.month].push(plan);
      return acc;
    }, {}) : {};

  // Years in descending order
  const years = Object.keys(groupedPlans).map(Number).sort((a, b) => b - a);

  // Show loading spinner while loading households (for admin) or checking user state
  if (user?.isAdmin && isLoadingHouseholds) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Monthly Plans</h1>
        <Button
          onClick={openCreateModal}
          className="flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Monthly Plan
        </Button>
      </div>

      {/* Household selector - only show for admin users */}
      {user?.isAdmin && (
        <div className="mb-6">
          <label htmlFor="household-select" className="block text-sm font-medium mb-2">
            Select Household
          </label>
          <select
            id="household-select"
            className="w-full md:w-1/2 p-2 border rounded-md"
            onChange={handleSelectHousehold}
            value={selectedHouseholdId || ''}
          >
            <option value="">Select a household</option>
            {households?.map((household) => (
              <option key={household.id} value={household.id}>
                {household.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Monthly Plans list */}
      {selectedHouseholdId ? (
        isLoadingPlans ? (
          <LoadingSpinner />
        ) : years.length > 0 ? (
          <div className="space-y-8">
            {years.map(year => (
              <div key={year} className="border rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-4">{year}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(groupedPlans[year]).sort((a, b) => Number(b[0]) - Number(a[0])).map(([month, plans]) => (
                    <div key={`${year}-${month}`} className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-3">
                        {format(new Date(year, parseInt(month) - 1), 'MMMM')}
                      </h3>
                      <div className="space-y-2">
                        {plans.map(plan => (
                          <div
                            key={plan.id}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${
                              plan.isClosed ? 'bg-gray-100' : 'bg-blue-50 hover:bg-blue-100'
                            }`}
                            onClick={() => navigate(`/monthly-plans/${plan.id}`)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{plan.name}</span>
                              {plan.isClosed ? (
                                <span className="text-gray-500 flex items-center">
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Closed</span>
                                </span>
                              ) : (
                                <span className="text-green-600 flex items-center">
                                  <CalendarCheck className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Active</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Created {new Date(plan.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No monthly plans found for this household</p>
            <Button onClick={openCreateModal}>
              Create your first monthly plan
            </Button>
          </div>
        )
      ) : user?.isAdmin ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Please select a household to view monthly plans</p>
        </div>
      ) : (
        <LoadingSpinner />
      )}

      {/* Create Monthly Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Monthly Plan</h2>
            <form onSubmit={handleSubmit(handleCreateMonthlyPlan)}>
              {/* Household select - only show for admin users */}
              {user?.isAdmin ? (
                <div className="mb-4">
                  <label htmlFor="householdId" className="block text-sm font-medium mb-1">
                    Household
                  </label>
                  <select
                    id="householdId"
                    {...register('householdId', { valueAsNumber: true })}
                    className="w-full p-2 border rounded-md"
                    defaultValue={selectedHouseholdId || ''}
                  >
                    <option value="">Select a household</option>
                    {households?.map((household) => (
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

              {/* Template select */}
              {isLoadingTemplates ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Template</label>
                  <div className="flex items-center p-2 border rounded-md">
                    <div className="w-5 h-5 mr-2">
                      <LoadingSpinner />
                    </div>
                    <span className="text-gray-500">Loading templates...</span>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <label htmlFor="templateId" className="block text-sm font-medium mb-1">
                    Template
                  </label>
                  <select
                    id="templateId"
                    {...register('templateId', { valueAsNumber: true })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select a template</option>
                    {templates?.map((template: Template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {errors.templateId && (
                    <p className="text-red-500 text-xs mt-1">{errors.templateId.message}</p>
                  )}
                </div>
              )}

              {/* Month and Year */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="month" className="block text-sm font-medium mb-1">
                    Month
                  </label>
                  <select
                    id="month"
                    {...register('month', { valueAsNumber: true })}
                    className="w-full p-2 border rounded-md"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {format(new Date(2000, month - 1), 'MMMM')}
                      </option>
                    ))}
                  </select>
                  {errors.month && (
                    <p className="text-red-500 text-xs mt-1">{errors.month.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="year" className="block text-sm font-medium mb-1">
                    Year
                  </label>
                  <select
                    id="year"
                    {...register('year', { valueAsNumber: true })}
                    className="w-full p-2 border rounded-md"
                    value={selectedYear}
                    onChange={handleYearChange}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  {errors.year && (
                    <p className="text-red-500 text-xs mt-1">{errors.year.message}</p>
                  )}
                </div>
              </div>

              {/* Name input */}
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Plan Name
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., January 2025 Plan"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
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
                  isLoading={createMonthlyPlanMutation.isPending}
                >
                  Create Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyPlansPage;
