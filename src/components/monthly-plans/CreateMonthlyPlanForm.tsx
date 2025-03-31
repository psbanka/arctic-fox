import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import type { Template } from '@shared/types';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { createMonthlyPlanSchema } from '@shared/schemas';

export type CreateMonthlyPlanFormData = z.infer<typeof createMonthlyPlanSchema>;

interface CreateMonthlyPlanFormProps {
  onSubmit: (data: CreateMonthlyPlanFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isAdmin: boolean;
  selectedHouseholdId: number | null;
  households?: { id: number; name: string }[];
  templates?: Template[];
  isLoadingTemplates: boolean;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

const CreateMonthlyPlanForm: FC<CreateMonthlyPlanFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting,
  isAdmin,
  selectedHouseholdId,
  households,
  templates,
  isLoadingTemplates,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateMonthlyPlanFormData>({
    resolver: zodResolver(createMonthlyPlanSchema),
    defaultValues: {
      name: `${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')} Plan`,
      month: selectedMonth,
      year: selectedYear,
      householdId: selectedHouseholdId || 0,
      templateId: 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Household select - only show for admin users */}
      {isAdmin ? (
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
          <label htmlFor="template-loading" className="block text-sm font-medium mb-1">Template</label>
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
            onChange={(e) => onMonthChange(Number.parseInt(e.target.value, 10))}
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
            onChange={(e) => onYearChange(Number.parseInt(e.target.value, 10))}
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
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          Create Plan
        </Button>
      </div>
    </form>
  );
};

export default CreateMonthlyPlanForm; 