import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/Layout';

// Lazy-loaded pages — each becomes a separate chunk
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Employees = lazy(() => import('./pages/Employees'));
const Leaves = lazy(() => import('./pages/Leaves'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Holidays = lazy(() => import('./pages/Holidays'));
const Hierarchy = lazy(() => import('./pages/Hierarchy'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const Reports = lazy(() => import('./pages/Reports'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Payslips = lazy(() => import('./pages/Payslips'));
const Performance = lazy(() => import('./pages/Performance'));
const Training = lazy(() => import('./pages/Training'));
const Documents = lazy(() => import('./pages/Documents'));
const Shifts = lazy(() => import('./pages/Shifts'));
const Messages = lazy(() => import('./pages/Messages'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const ExitManagement = lazy(() => import('./pages/ExitManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const CompanyPolicies = lazy(() => import('./pages/CompanyPolicies'));
const NDAAgreements = lazy(() => import('./pages/NDAAgreements'));
const AssetManagement = lazy(() => import('./pages/AssetManagement'));
const LoanManagement = lazy(() => import('./pages/LoanManagement'));
const LetterGeneration = lazy(() => import('./pages/LetterGeneration'));
const LeaveCalendar = lazy(() => import('./pages/LeaveCalendar'));
const KanbanApprovals = lazy(() => import('./pages/KanbanApprovals'));
const TeamCalendar = lazy(() => import('./pages/TeamCalendar'));
const MySpace = lazy(() => import('./pages/MySpace'));
const SmartAnalytics = lazy(() => import('./pages/SmartAnalytics'));
const Tickets = lazy(() => import('./pages/Tickets'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin h-8 w-8 border-3 border-indigo-600 border-t-transparent rounded-full" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  );
  return token ? children : <Navigate to="/login" />;
}

function ManagerRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'admin' || user?.role === 'manager') return children;
  return <Navigate to="/" />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'admin') return children;
  return <Navigate to="/" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="employees" element={<ErrorBoundary><Employees /></ErrorBoundary>} />
            <Route path="attendance" element={<ErrorBoundary><Attendance /></ErrorBoundary>} />
            <Route path="leaves" element={<ErrorBoundary><Leaves /></ErrorBoundary>} />
            <Route path="holidays" element={<ErrorBoundary><Holidays /></ErrorBoundary>} />
            <Route path="expenses" element={<ErrorBoundary><Expenses /></ErrorBoundary>} />
            <Route path="payslips" element={<ErrorBoundary><Payslips /></ErrorBoundary>} />
            <Route path="performance" element={<ErrorBoundary><Performance /></ErrorBoundary>} />
            <Route path="training" element={<ErrorBoundary><Training /></ErrorBoundary>} />
            <Route path="shifts" element={<ManagerRoute><ErrorBoundary><Shifts /></ErrorBoundary></ManagerRoute>} />
            <Route path="documents" element={<ErrorBoundary><Documents /></ErrorBoundary>} />
            <Route path="messages" element={<ErrorBoundary><Messages /></ErrorBoundary>} />
            <Route path="hierarchy" element={<ErrorBoundary><Hierarchy /></ErrorBoundary>} />
            <Route path="reports" element={<ManagerRoute><ErrorBoundary><Reports /></ErrorBoundary></ManagerRoute>} />
            <Route path="announcements" element={<ErrorBoundary><Announcements /></ErrorBoundary>} />
            <Route path="onboarding" element={<AdminRoute><ErrorBoundary><Onboarding /></ErrorBoundary></AdminRoute>} />
            <Route path="exit" element={<AdminRoute><ErrorBoundary><ExitManagement /></ErrorBoundary></AdminRoute>} />
            <Route path="company-policies" element={<ErrorBoundary><CompanyPolicies /></ErrorBoundary>} />
            <Route path="nda-agreements" element={<ErrorBoundary><NDAAgreements /></ErrorBoundary>} />
            <Route path="leave-calendar" element={<ErrorBoundary><LeaveCalendar /></ErrorBoundary>} />
            <Route path="assets" element={<ManagerRoute><ErrorBoundary><AssetManagement /></ErrorBoundary></ManagerRoute>} />
            <Route path="loans" element={<ErrorBoundary><LoanManagement /></ErrorBoundary>} />
            <Route path="letters" element={<AdminRoute><ErrorBoundary><LetterGeneration /></ErrorBoundary></AdminRoute>} />
            <Route path="settings" element={<AdminRoute><ErrorBoundary><Settings /></ErrorBoundary></AdminRoute>} />
            <Route path="profile" element={<ErrorBoundary><MyProfile /></ErrorBoundary>} />
            <Route path="approvals" element={<ManagerRoute><ErrorBoundary><KanbanApprovals /></ErrorBoundary></ManagerRoute>} />
            <Route path="team-calendar" element={<ManagerRoute><ErrorBoundary><TeamCalendar /></ErrorBoundary></ManagerRoute>} />
            <Route path="my-space" element={<ErrorBoundary><MySpace /></ErrorBoundary>} />
            <Route path="smart-analytics" element={<ManagerRoute><ErrorBoundary><SmartAnalytics /></ErrorBoundary></ManagerRoute>} />
            <Route path="tickets" element={<ErrorBoundary><Tickets /></ErrorBoundary>} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
