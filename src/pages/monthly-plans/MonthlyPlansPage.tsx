import { type FC, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { PlusCircle, CheckCircle2, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import CreateMonthlyPlanForm, { type CreateMonthlyPlanFormData } from '../../components/monthly-plans/CreateMonthlyPlanForm';
import type { MonthlyPlan } from '@shared/types';
import { useAuth } from '../../contexts/AuthContext';

const MonthlyPlansPage: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Set the default household ID when the user data is available
  useEffect(() => {
    if (user && !user.isAdmin && user.defaultHouseholdId) {
      setSelectedHouseholdId(user.defaultHouseholdId);
    }
  }, [user]);

  // Fetch households (only needed for admin users)
  const { data: households, isLoading: isLoadingHouseholds } = useQuery({
    queryKey: ['households'],
    queryFn: api.households.getAll,
    enabled: user?.isAdmin || false,
  });

  const queryFunction = () => selectedHouseholdId
    ? api.monthlyPlans.getByHousehold(selectedHouseholdId)
    : []

  // Fetch monthly plans based on selected household
  const {
    data: monthlyPlans,
    isLoading: isLoadingPlans,
  } = useQuery({
    queryKey: ['monthlyPlans', selectedHouseholdId],
    queryFn: queryFunction,
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

  // We are working in here.
  // Create monthly plan mutation
  const createMonthlyPlanMutation = useMutation({
    mutationFn: (data: CreateMonthlyPlanFormData) => {
      return api.monthlyPlans.create(data);
    },
    onSuccess: (newPlan) => {
      toast.success('Monthly plan created successfully!');
      setIsModalOpen(false);
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
    const id = Number.parseInt(event.target.value, 10);
    setSelectedHouseholdId(id || null);
  };

  const openCreateModal = () => {
    setIsModalOpen(true);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  // Group plans by year and month
  const groupedPlans = monthlyPlans ?
    monthlyPlans.reduce<Record<number, Record<number, MonthlyPlan[]>>>((acc, plan) => {
      if (!acc[plan.year]) {
        acc[plan.year] = {};
      }
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      if (!acc[plan.year]![plan.month]) {
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        acc[plan.year]![plan.month] = [];
      }
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      acc[plan.year]![plan.month]!.push(plan);
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              openCreateModal();
            }
          }}
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
                  {/* biome-ignore lint/style/noNonNullAssertion: <explanation> */}
                  {Object.entries(groupedPlans[year]!).sort((a, b) => Number.parseInt(b[0], 10) - Number.parseInt(a[0], 10)).map(([month, plans]) => (
                    <div key={`${year}-${month}`} className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-3">
                        {format(new Date(year, Number.parseInt(month, 10) - 1), 'MMMM')}
                      </h3>
                      <div className="space-y-2">
                        {plans.map(plan => (
                          <div
                            key={plan.id}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${
                              plan.isClosed ? 'bg-gray-100' : 'bg-blue-50 hover:bg-blue-100'
                            }`}
                            onClick={() => navigate(`/monthly-plans/${plan.id}`)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                navigate(`/monthly-plans/${plan.id}`);
                              }
                            }}
                            role="button"
                            tabIndex={0}
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
            <CreateMonthlyPlanForm
              onSubmit={handleCreateMonthlyPlan}
              onCancel={() => setIsModalOpen(false)}
              isSubmitting={createMonthlyPlanMutation.isPending}
              isAdmin={user?.isAdmin || false}
              selectedHouseholdId={selectedHouseholdId}
              households={households}
              templates={templates}
              isLoadingTemplates={isLoadingTemplates}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={handleMonthChange}
              onYearChange={handleYearChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyPlansPage;
