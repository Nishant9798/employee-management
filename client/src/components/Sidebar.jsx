import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Users, CalendarCheck, CalendarDays, TreePine, UserCircle, LogOut, X, Building2, BarChart3, Megaphone, Sun, Moon, Receipt, Wallet, Award, GraduationCap, Clock, ClipboardList, DoorOpen, MessageSquare, FileText, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: '/leaves', icon: CalendarDays, label: 'Leaves' },
  { to: '/holidays', icon: Building2, label: 'Holidays' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/payslips', icon: Wallet, label: 'Payslips' },
  { to: '/performance', icon: Award, label: 'Performance' },
  { to: '/training', icon: GraduationCap, label: 'Training' },
  { to: '/shifts', icon: Clock, label: 'Shifts' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/hierarchy', icon: TreePine, label: 'Org Hierarchy' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/announcements', icon: Megaphone, label: 'Announcements' },
];

const adminLinks = [
  { to: '/onboarding', icon: ClipboardList, label: 'Onboarding' },
  { to: '/exit', icon: DoorOpen, label: 'Exit Management' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function SidebarLink({ link, collapsed, onClose }) {
  return (
    <div className={collapsed ? 'tooltip-wrapper' : ''}>
      <NavLink
        to={link.to}
        end={link.end}
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-gray-600 dark:text-gray-400'}`}
        onClick={onClose}
      >
        <link.icon size={18} className="shrink-0" />
        {!collapsed && <span>{link.label}</span>}
      </NavLink>
      {collapsed && <div className="tooltip">{link.label}</div>}
    </div>
  );
}

export default function Sidebar({ onClose, collapsed, onToggleCollapse }) {
  const { user, logout, isAdmin } = useAuth();
  const { dark, toggleTheme } = useTheme();

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-5 border-b dark:border-gray-700`}>
        {collapsed ? (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
            <Users size={20} className="text-white" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white">EMS</h1>
                <p className="text-[10px] text-gray-400 -mt-0.5">Employee Management</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={20} />
            </button>
          </>
        )}
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="px-5 py-4 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md pulse-dot">
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.designation}</p>
            </div>
          </div>
          {isAdmin && (
            <span className="mt-2 inline-block badge badge-info">Admin</span>
          )}
          {user?.role === 'manager' && (
            <span className="mt-2 inline-block badge badge-success">Manager</span>
          )}
        </div>
      )}

      {collapsed && (
        <div className="py-3 border-b dark:border-gray-700 flex justify-center">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-md pulse-dot">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {links.map(link => (
          <SidebarLink key={link.to} link={link} collapsed={collapsed} onClose={onClose} />
        ))}

        {isAdmin && (
          <>
            {!collapsed && (
              <div className="pt-3 pb-1 px-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
              </div>
            )}
            {collapsed && <div className="border-t dark:border-gray-700 my-2" />}
            {adminLinks.map(link => (
              <SidebarLink key={link.to} link={link} collapsed={collapsed} onClose={onClose} />
            ))}
          </>
        )}

        <SidebarLink
          link={{ to: '/profile', icon: UserCircle, label: 'My Profile' }}
          collapsed={collapsed}
          onClose={onClose}
        />
      </nav>

      {/* Theme toggle + Logout + Collapse */}
      <div className="p-3 border-t dark:border-gray-700 space-y-1">
        <div className={collapsed ? 'tooltip-wrapper' : ''}>
          <button onClick={toggleTheme} className={`sidebar-link text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full ${collapsed ? 'justify-center px-2' : ''}`}>
            {dark ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
            {!collapsed && (dark ? 'Light Mode' : 'Dark Mode')}
          </button>
          {collapsed && <div className="tooltip">{dark ? 'Light Mode' : 'Dark Mode'}</div>}
        </div>
        <div className={collapsed ? 'tooltip-wrapper' : ''}>
          <button onClick={logout} className={`sidebar-link text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full ${collapsed ? 'justify-center px-2' : ''}`}>
            <LogOut size={18} className="shrink-0" />
            {!collapsed && 'Logout'}
          </button>
          {collapsed && <div className="tooltip">Logout</div>}
        </div>

        {/* Collapse toggle - desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex sidebar-link text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full justify-center"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </div>
  );
}
