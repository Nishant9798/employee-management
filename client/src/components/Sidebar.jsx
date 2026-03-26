import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, CalendarCheck, CalendarDays, TreePine, UserCircle, LogOut, X, Building2 } from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: '/leaves', icon: CalendarDays, label: 'Leaves' },
  { to: '/holidays', icon: Building2, label: 'Holidays' },
  { to: '/hierarchy', icon: TreePine, label: 'Org Hierarchy' },
  { to: '/profile', icon: UserCircle, label: 'My Profile' },
];

export default function Sidebar({ onClose }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">EMS</h1>
            <p className="text-[10px] text-gray-400 -mt-0.5">Employee Management</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.designation}</p>
          </div>
        </div>
        {isAdmin && (
          <span className="mt-2 inline-block badge badge-info">Admin</span>
        )}
        {user?.role === 'manager' && (
          <span className="mt-2 inline-block badge badge-success">Manager</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-gray-600'}`}
            onClick={onClose}
          >
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t">
        <button onClick={logout} className="sidebar-link text-red-600 hover:bg-red-50 w-full">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}
