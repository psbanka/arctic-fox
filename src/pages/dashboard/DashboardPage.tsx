import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, ClipboardList, Calendar, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user's households
  const { data: households, isLoading } = useQuery({
    queryKey: ['households'],
    queryFn: api.households.getAll,
  });

  // Choose the most recently used household or first household
  const primaryHousehold = households?.[0];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const noHouseholds = !households || households.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-2 sm:mt-0">
          <Button
            onClick={() => navigate('/households/new')}
            icon={<Users size={18} />}
          >
            New Household
          </Button>
        </div>
      </div>

      {noHouseholds ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="mb-4 flex justify-center">
            <Users size={48} className="text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Welcome to Family Task Manager!</h2>
          <p className="text-gray-600 mb-4">
            Get started by creating your first household. You can then add family members,
            create task templates, and track your monthly goals together.
          </p>
          <Button
            onClick={() => navigate('/households/new')}
            icon={<Users size={18} />}
          >
            Create Your First Household
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardCard
              title="Households"
              count={households?.length || 0}
              icon={<Users className="text-blue-500" size={24} />}
              onClick={() => navigate('/households')}
            />
            <DashboardCard
              title="Templates"
              count={primaryHousehold ? "View" : 0}
              icon={<ClipboardList className="text-indigo-500" size={24} />}
              onClick={() => primaryHousehold && navigate(`/templates?household=${primaryHousehold.id}`)}
              disabled={!primaryHousehold}
            />
            <DashboardCard
              title="Monthly Plans"
              count={primaryHousehold ? "View" : 0}
              icon={<Calendar className="text-green-500" size={24} />}
              onClick={() => primaryHousehold && navigate(`/monthly-plans?household=${primaryHousehold.id}`)}
              disabled={!primaryHousehold}
            />
            <DashboardCard
              title="Tasks"
              count={primaryHousehold ? "View" : 0}
              icon={<CheckCircle2 className="text-purple-500" size={24} />}
              onClick={() => primaryHousehold && navigate(`/monthly-plans?household=${primaryHousehold.id}`)}
              disabled={!primaryHousehold}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden lg:col-span-2">
              <div className="border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold">Recent Households</h2>
              </div>
              <div className="p-4">
                <ul className="divide-y divide-gray-200">
                  {households?.slice(0, 5).map((household) => (
                    <li key={household.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users size={20} className="text-blue-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{household.name}</div>
                            <div className="text-sm text-gray-500">
                              {household.isOwner ? "Owner" : "Member"}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/households/${household.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold">Welcome, {user?.firstName}!</h2>
              </div>
              <div className="p-4">
                <p className="text-gray-600 mb-4">
                  Here are some quick tips to get you started:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                      <span className="text-xs font-medium text-blue-600">1</span>
                    </span>
                    <span className="text-sm text-gray-600">
                      Create a household or join an existing one
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                      <span className="text-xs font-medium text-blue-600">2</span>
                    </span>
                    <span className="text-sm text-gray-600">
                      Set up task categories that matter to your family
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                      <span className="text-xs font-medium text-blue-600">3</span>
                    </span>
                    <span className="text-sm text-gray-600">
                      Create task templates with monthly goals
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                      <span className="text-xs font-medium text-blue-600">4</span>
                    </span>
                    <span className="text-sm text-gray-600">
                      Generate monthly plans and track progress
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface DashboardCardProps {
  title: string;
  count: number | string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  count,
  icon,
  onClick,
  disabled = false
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-6 ${onClick && !disabled ? 'cursor-pointer hover:shadow transition-shadow' : ''} ${disabled ? 'opacity-50' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-2xl font-semibold mt-1">{count}</p>
        </div>
        {icon}
      </div>
    </div>
  );
};

export default DashboardPage;
