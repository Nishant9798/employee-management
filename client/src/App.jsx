import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Leaves from './pages/Leaves';
import Attendance from './pages/Attendance';
import Holidays from './pages/Holidays';
import Hierarchy from './pages/Hierarchy';
import MyProfile from './pages/MyProfile';
import Reports from './pages/Reports';
import Announcements from './pages/Announcements';
import Expenses from './pages/Expenses';
import Payslips from './pages/Payslips';
import Performance from './pages/Performance';
import Training from './pages/Training';
import Documents from './pages/Documents';
import Shifts from './pages/Shifts';
import Messages from './pages/Messages';
import Onboarding from './pages/Onboarding';
import ExitManagement from './pages/ExitManagement';
import Settings from './pages/Settings';
import CompanyPolicies from './pages/CompanyPolicies';
import NDAAgreements from './pages/NDAAgreements';
import AssetManagement from './pages/AssetManagement';
import LoanManagement from './pages/LoanManagement';
import LetterGeneration from './pages/LetterGeneration';
import LeaveCalendar from './pages/LeaveCalendar';
import KanbanApprovals from './pages/KanbanApprovals';
import TeamCalendar from './pages/TeamCalendar';
import MySpace from './pages/MySpace';
import SmartAnalytics from './pages/SmartAnalytics';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="holidays" element={<Holidays />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="payslips" element={<Payslips />} />
        <Route path="performance" element={<Performance />} />
        <Route path="training" element={<Training />} />
        <Route path="shifts" element={<Shifts />} />
        <Route path="documents" element={<Documents />} />
        <Route path="messages" element={<Messages />} />
        <Route path="hierarchy" element={<Hierarchy />} />
        <Route path="reports" element={<Reports />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="exit" element={<ExitManagement />} />
        <Route path="company-policies" element={<CompanyPolicies />} />
        <Route path="nda-agreements" element={<NDAAgreements />} />
        <Route path="leave-calendar" element={<LeaveCalendar />} />
        <Route path="assets" element={<AssetManagement />} />
        <Route path="loans" element={<LoanManagement />} />
        <Route path="letters" element={<LetterGeneration />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="approvals" element={<KanbanApprovals />} />
        <Route path="team-calendar" element={<TeamCalendar />} />
        <Route path="my-space" element={<MySpace />} />
        <Route path="smart-analytics" element={<SmartAnalytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
