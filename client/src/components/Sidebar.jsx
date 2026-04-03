import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Users, CalendarCheck, CalendarDays, TreePine, UserCircle, LogOut, X, Building2, BarChart3, Megaphone, Sun, Moon, Receipt, Wallet, Award, GraduationCap, Clock, ClipboardList, DoorOpen, MessageSquare, FileText, Settings, ChevronLeft, ChevronRight, Shield, FileSignature, Calendar, Package, Banknote, FileOutput, Sparkles, CalendarRange, Kanban, Brain, ChevronDown, Ticket, HelpCircle } from 'lucide-react';
import api from '../api';

// role: undefined = all, 'manager' = manager+admin, 'admin' = admin only
const navGroups = [
  {
    key: 'main',
    label: 'Main',
    links: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/my-space', icon: Sparkles, label: 'My Space' },
    ],
  },
  {
    key: 'people',
    label: 'People',
    links: [
      { to: '/employees', icon: Users, label: 'Employees' },
      { to: '/hierarchy', icon: TreePine, label: 'Org Hierarchy' },
    ],
  },
  {
    key: 'time-attendance',
    label: 'Time & Attendance',
    links: [
      { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
      { to: '/leaves', icon: CalendarDays, label: 'Leaves' },
      { to: '/leave-calendar', icon: Calendar, label: 'Leave Calendar' },
      { to: '/team-calendar', icon: CalendarRange, label: 'Team Calendar', role: 'manager' },
      { to: '/holidays', icon: Building2, label: 'Holidays' },
      { to: '/shifts', icon: Clock, label: 'Shifts', role: 'manager' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    links: [
      { to: '/expenses', icon: Receipt, label: 'Expenses' },
      { to: '/payslips', icon: Wallet, label: 'Payslips' },
      { to: '/loans', icon: Banknote, label: 'Loans & Advances' },
    ],
  },
  {
    key: 'performance',
    label: 'Performance',
    links: [
      { to: '/performance', icon: Award, label: 'Performance' },
      { to: '/training', icon: GraduationCap, label: 'Training' },
    ],
  },
  {
    key: 'approvals',
    label: 'Approvals',
    role: 'manager',
    links: [
      { to: '/approvals', icon: Kanban, label: 'Kanban Board' },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    links: [
      { to: '/tickets', icon: Ticket, label: 'Helpdesk' },
    ],
  },
  {
    key: 'communication',
    label: 'Communication',
    links: [
      { to: '/messages', icon: MessageSquare, label: 'Messages' },
      { to: '/announcements', icon: Megaphone, label: 'Announcements' },
    ],
  },
  {
    key: 'documents',
    label: 'Documents',
    links: [
      { to: '/documents', icon: FileText, label: 'Documents' },
      { to: '/company-policies', icon: Shield, label: 'Company Policies' },
      { to: '/nda-agreements', icon: FileSignature, label: 'NDA & Agreements' },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    role: 'manager',
    links: [
      { to: '/reports', icon: BarChart3, label: 'Reports' },
      { to: '/smart-analytics', icon: Brain, label: 'Smart Insights' },
    ],
  },
  {
    key: 'assets',
    label: 'Assets',
    role: 'manager',
    links: [
      { to: '/assets', icon: Package, label: 'Assets' },
    ],
  },
];

const adminGroup = {
  key: 'admin',
  label: 'Admin',
  links: [
    { to: '/onboarding', icon: ClipboardList, label: 'Onboarding' },
    { to: '/exit', icon: DoorOpen, label: 'Exit Management' },
    { to: '/letters', icon: FileOutput, label: 'Letter Generation' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ],
};

const STORAGE_KEY = 'ems:sidebar-expanded-groups';

function getInitialExpandedGroups() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function SidebarLink({ link, collapsed, onClose, badge }) {
  return (
    <div className={collapsed ? 'tooltip-wrapper' : ''}>
      <NavLink
        to={link.to}
        end={link.end}
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-slate-600 dark:text-slate-400'}`}
        onClick={onClose}
      >
        <div className="relative shrink-0">
          <link.icon size={18} strokeWidth={2} />
          {collapsed && badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full flex items-center justify-center shadow-sm">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        {!collapsed && (
          <span className="flex-1 flex items-center justify-between">
            <span>{link.label}</span>
            {badge > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 text-[11px] font-semibold text-white bg-rose-500 rounded-full flex items-center justify-center ml-2 shadow-sm notif-pulse">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
        )}
      </NavLink>
      {collapsed && <div className="tooltip">{link.label}</div>}
    </div>
  );
}

function SidebarGroup({ group, collapsed, onClose, expanded, onToggle, badges }) {
  if (collapsed) {
    return (
      <>
        {group.links.map(link => (
          <SidebarLink key={link.to} link={link} collapsed={collapsed} onClose={onClose} badge={badges[link.to] || 0} />
        ))}
      </>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <span>{group.label}</span>
        <ChevronDown
          size={14}
          className={`transform transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
        />
      </button>
      <div className={`sidebar-group-content ${expanded ? 'expanded' : 'collapsed'}`}>
        <div className="space-y-0.5">
          {group.links.map(link => (
            <SidebarLink key={link.to} link={link} collapsed={collapsed} onClose={onClose} badge={badges[link.to] || 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ onClose, collapsed, onToggleCollapse }) {
  const { user, logout, isAdmin } = useAuth();
  const { dark, toggleTheme } = useTheme();

  const allGroupKeys = [...navGroups.map(g => g.key), 'admin'];
  const defaultExpanded = Object.fromEntries(allGroupKeys.map(k => [k, true]));

  const [expandedGroups, setExpandedGroups] = useState(() => {
    return getInitialExpandedGroups() || defaultExpanded;
  });

  const [badges, setBadges] = useState({});

  // Persist expanded groups to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedGroups));
    } catch {}
  }, [expandedGroups]);

  // Fetch notification badges
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const newBadges = {};

        const requests = [];

        if (isAdmin || user?.role === 'manager') {
          requests.push(
            api.get('/leaves/all-applications').then(res => {
              const pending = (res.data || []).filter(l => l.status === 'pending_manager' || l.status === 'pending_hr');
              newBadges['/leaves'] = pending.length;
            }).catch(() => {}),
            api.get('/expenses/all').then(res => {
              const pending = (res.data || []).filter(e => e.status === 'pending_manager' || e.status === 'pending_finance');
              newBadges['/expenses'] = pending.length;
            }).catch(() => {})
          );
        }

        requests.push(
          api.get('/messages/unread-count').then(res => {
            newBadges['/messages'] = res.data?.count || 0;
          }).catch(() => {}),
          api.get('/tickets/count/open').then(res => {
            newBadges['/tickets'] = res.data?.count || 0;
          }).catch(() => {})
        );

        // Calculate total pending approvals for the kanban badge
        if (isAdmin || user?.role === 'manager') {
          requests.push(
            Promise.all([
              api.get('/leaves/all-applications').catch(() => ({ data: [] })),
              api.get('/expenses/all').catch(() => ({ data: [] })),
              api.get('/loans/all').catch(() => ({ data: [] })),
            ]).then(([lr, er, lo]) => {
              const pendingLeaves = (lr.data || []).filter(l => l.status === 'pending_manager' || l.status === 'pending_hr').length;
              const pendingExpenses = (er.data || []).filter(e => e.status === 'pending_manager' || e.status === 'pending_finance').length;
              const pendingLoans = (lo.data || []).filter(l => l.status === 'pending').length;
              newBadges['/approvals'] = pendingLeaves + pendingExpenses + pendingLoans;
            }).catch(() => {})
          );
        }

        await Promise.all(requests);
        setBadges(newBadges);
      } catch {}
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, [isAdmin, user?.role]);

  const toggleGroup = useCallback((key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Filter groups and links based on user role
  const filterByRole = (groups) => {
    return groups
      .filter(group => {
        if (!group.role) return true;
        if (group.role === 'admin') return isAdmin;
        if (group.role === 'manager') return isAdmin || user?.role === 'manager';
        return true;
      })
      .map(group => ({
        ...group,
        links: group.links.filter(link => {
          if (!link.role) return true;
          if (link.role === 'admin') return isAdmin;
          if (link.role === 'manager') return isAdmin || user?.role === 'manager';
          return true;
        }),
      }))
      .filter(group => group.links.length > 0);
  };

  const baseGroups = isAdmin ? [...navGroups, adminGroup] : navGroups;
  const groups = filterByRole(baseGroups);

  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className={`flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-700/50 transition-all duration-300 ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-5 border-b border-slate-100 dark:border-slate-800`}>
        {collapsed ? (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10">
            <Users size={20} className="text-white" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-purple-700 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">EMS</h1>
                <p className="text-[10px] text-slate-400 -mt-0.5 font-medium">Employee Management</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors">
              <X size={20} />
            </button>
          </>
        )}
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/80 to-indigo-50/30 dark:from-slate-800/30 dark:to-indigo-900/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
                {userInitials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.designation}</p>
            </div>
          </div>
          {isAdmin && (
            <span className="mt-2.5 inline-block badge badge-info">Admin</span>
          )}
          {user?.role === 'manager' && (
            <span className="mt-2.5 inline-block badge badge-success">Manager</span>
          )}
        </div>
      )}

      {collapsed && (
        <div className="py-3 border-b border-slate-100 dark:border-slate-800 flex justify-center">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-500/20">
              {userInitials}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Main navigation">
        {groups.map(group => (
          <SidebarGroup
            key={group.key}
            group={group}
            collapsed={collapsed}
            onClose={onClose}
            expanded={expandedGroups[group.key] !== false}
            onToggle={() => toggleGroup(group.key)}
            badges={badges}
          />
        ))}

        {/* My Profile */}
        <div className="pt-2">
          <SidebarLink
            link={{ to: '/profile', icon: UserCircle, label: 'My Profile' }}
            collapsed={collapsed}
            onClose={onClose}
            badge={0}
          />
        </div>
      </nav>

      {/* Theme toggle + Logout + Collapse */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1 bg-slate-50/50 dark:bg-slate-800/30">
        <div className={collapsed ? 'tooltip-wrapper' : ''}>
          <button onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className={`sidebar-link text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 w-full ${collapsed ? 'justify-center px-2' : ''}`}>
            {dark ? <Sun size={18} className="shrink-0 text-amber-500" /> : <Moon size={18} className="shrink-0 text-indigo-500" />}
            {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          {collapsed && <div className="tooltip">{dark ? 'Light Mode' : 'Dark Mode'}</div>}
        </div>
        <div className={collapsed ? 'tooltip-wrapper' : ''}>
          <button onClick={logout} aria-label="Logout" className={`sidebar-link text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 w-full ${collapsed ? 'justify-center px-2' : ''}`}>
            <LogOut size={18} className="shrink-0" />
            {!collapsed && 'Logout'}
          </button>
          {collapsed && <div className="tooltip">Logout</div>}
        </div>

        {/* Collapse toggle - desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex sidebar-link text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 w-full justify-center"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </div>
  );
}
