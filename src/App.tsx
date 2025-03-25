import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/auth/LoginPage";
import LoadingSpinner from "./components/ui/LoadingSpinner";

// Lazy load routes to improve initial load time
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
// const HouseholdsPage = lazy(() => import("./pages/households/HouseholdsPage"));
// const HouseholdDetailPage = lazy(() => import("./pages/households/HouseholdDetailPage"));
const TemplatesPage = lazy(() => import("./pages/templates/TemplatesPage"));
const TemplateDetailPage = lazy(() => import("./pages/templates/TemplateDetailPage"));
const MonthlyPlansPage = lazy(() => import("./pages/monthly-plans/MonthlyPlansPage"));
const MonthlyPlanDetailPage = lazy(() => import("./pages/monthly-plans/MonthlyPlanDetailPage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Give auth a chance to restore from localStorage
    setIsReady(true);
  }, []);

  if (!isReady) {
    return <LoadingSpinner />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route
                path="/"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="/dashboard"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              {/*
              <Route
                path="/households"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <HouseholdsPage />
                  </Suspense>
                }
              />
              <Route
                path="/households/:id"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <HouseholdDetailPage />
                  </Suspense>
                }
              />
              */}
              <Route
                path="/templates"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <TemplatesPage />
                  </Suspense>
                }
              />
              <Route
                path="/templates/:id"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <TemplateDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="/monthly-plans"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <MonthlyPlansPage />
                  </Suspense>
                }
              />
              <Route
                path="/monthly-plans/:id"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <MonthlyPlanDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingSpinner />}>
                      <AdminPage />
                    </Suspense>
                  </AdminRoute>
                }
              />
              <Route
                path="*"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <NotFoundPage />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
