import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, X, Command, ChevronRight, Inbox, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

// Breadcrumb labels for routes
const ROUTE_LABELS = {
  '': 'Dashboard', 'employees': 'Employees', 'attendance': 'Attendance', 'leaves': 'Leaves',
  'holidays': 'Holidays', 'expenses': 'Expenses', 'payslips': 'Payslips', 'performance': 'Performance',
  'training': 'Training', 'shifts': 'Shifts', 'documents': 'Documents', 'messages': 'Messages',
  'hierarchy': 'Org Hierarchy', 'reports': 'Reports', 'announcements': 'Announcements',
  'onboarding': 'Onboarding', 'exit': 'Exit Management', 'company-policies': 'Company Policies',
  'nda-agreements': 'NDA & Agreements', 'leave-calendar': 'Leave Calendar', 'assets': 'Assets',
  'loans': 'Loans & Advances', 'letters': 'Letter Generation', 'settings': 'Settings',
  'profile': 'My Profile', 'approvals': 'Approvals', 'team-calendar': 'Team Calendar',
  'my-space': 'My Space', 'smart-analytics': 'Smart Insights', 'tickets': 'Helpdesk',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifTab, setNotifTab] = useState('all'); // 'all' | 'unread'
  const notifRef = useRef(null);
  const prevUnreadRef = useRef(0);

  // Global search (Ctrl+K modal)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Faster polling: 15s
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    api.get('/notifications/unread-count').then(r => {
      const newCount = r.data.count;
      // Toast for new notifications
      if (prevUnreadRef.current > 0 && newCount > prevUnreadRef.current) {
        toast('You have new notifications', { icon: '🔔', duration: 3000 });
      }
      prevUnreadRef.current = newCount;
      setUnreadCount(newCount);
    }).catch(() => {});
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
  };

  const markAsRead = async (id) => {
    try { await api.put(`/notifications/read/${id}`); loadNotifications(); } catch {}
  };

  const markAllRead = async () => {
    try { await api.put('/notifications/read-all'); loadNotifications(); } catch {}
  };

  const deleteNotification = async (e, id) => {
    e.stopPropagation();
    try { await api.delete(`/notifications/${id}`); loadNotifications(); } catch {}
  };

  // Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
        setSearchQuery('');
        setSearchResults(null);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults(null); return; }
    const timeout = setTimeout(() => {
      api.get('/settings/search', { params: { q: searchQuery } }).then(r => setSearchResults(r.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const notifIcon = (type) => {
    switch (type) {
      case 'leave': return '📋';
      case 'expense': return '💰';
      case 'performance': return '⭐';
      case 'ticket': return '🎫';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'error': return '❌';
      case 'attendance': return '📅';
      default: return 'ℹ️';
    }
  };

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleSearchNavigate = (path) => {
    navigate(path);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults(null);
  };

  // Breadcrumbs
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentPage = ROUTE_LABELS[pathSegments[0] || ''] || 'Dashboard';

  // Filtered notifications
  const filteredNotifs = notifTab === 'unread' ? notifications.filter(n => !n.isRead) : notifications;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-all duration-300 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}`}>
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b dark:border-gray-700 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <Menu size={22} className="text-gray-600 dark:text-gray-300" />
            </button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-sm">
              <span className="text-gray-400 dark:text-gray-500">Home</span>
              {pathSegments.length > 0 && (
                <>
                  <ChevronRight size={12} className="text-gray-300 dark:text-gray-600" />
                  <span className="font-medium text-gray-700 dark:text-gray-200">{currentPage}</span>
                </>
              )}
            </div>

            <h1 className="text-lg font-bold text-indigo-800 dark:text-indigo-400 sm:hidden">EMS</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search trigger */}
            <button
              onClick={() => setShowSearch(true)}
              className="hidden sm:flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer group"
            >
              <Search size={16} className="text-gray-400 group-hover:text-gray-500" />
              <span className="text-sm text-gray-400 w-32 lg:w-48 text-left">Search...</span>
              <kbd>Ctrl K</kbd>
            </button>

            {/* Notifications Bell */}
            <div ref={notifRef} className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <Bell size={20} className={`text-gray-600 dark:text-gray-300 transition-transform ${showNotifs ? 'scale-110' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-in">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifs && (
                <div className="absolute top-full mt-2 right-0 w-80 sm:w-[420px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border dark:border-gray-700 overflow-hidden z-50 animate-scale-in">
                  {/* Header */}
                  <div className="px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold dark:text-white">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                            <CheckCheck size={12} /> Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-0.5">
                      <button onClick={() => setNotifTab('all')}
                        className={`flex-1 text-xs font-medium py-1.5 rounded-md transition ${notifTab === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        All ({notifications.length})
                      </button>
                      <button onClick={() => setNotifTab('unread')}
                        className={`flex-1 text-xs font-medium py-1.5 rounded-md transition ${notifTab === 'unread' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        Unread ({unreadCount})
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {filteredNotifs.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <Inbox size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-400">{notifTab === 'unread' ? 'All caught up!' : 'No notifications yet'}</p>
                      </div>
                    ) : (
                      filteredNotifs.slice(0, 20).map(n => (
                        <button key={n.id} onClick={() => { if (n.link) navigate(n.link); markAsRead(n.id); setShowNotifs(false); }}
                          className={`group w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex gap-3 transition border-b dark:border-gray-700/50 last:border-0 ${!n.isRead ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg shrink-0">
                            {notifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm flex-1 ${!n.isRead ? 'font-semibold text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</p>
                              {!n.isRead && <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{n.message}</p>
                            <p className="text-[10px] text-gray-300 dark:text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                          <button onClick={(e) => deleteNotification(e, n.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition shrink-0 self-center">
                            <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
                          </button>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar in header */}
            <button onClick={() => navigate('/profile')} className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-2 py-1.5 transition">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-800 dark:text-white leading-tight">{user?.name?.split(' ')[0]}</p>
                <p className="text-[10px] text-gray-400 leading-tight capitalize">{user?.role}</p>
              </div>
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Ctrl+K Search Modal */}
      {showSearch && (
        <div className="search-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSearch(false); }}>
          <div className="search-modal mx-4">
            <div className="flex items-center gap-3 px-4 py-3 border-b dark:border-gray-700">
              <Search size={20} className="text-gray-400 shrink-0" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search employees, announcements..."
                className="flex-1 bg-transparent text-gray-800 dark:text-white outline-none text-base placeholder-gray-400"
              />
              <button onClick={() => setShowSearch(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <kbd>ESC</kbd>
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {!searchResults && searchQuery.length < 2 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-400">Type to search employees and announcements</p>
                  <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">Minimum 2 characters</p>
                </div>
              )}

              {searchResults && (
                <>
                  {searchResults.employees?.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">Employees</p>
                      {searchResults.employees.map(e => (
                        <button key={e.id} onClick={() => handleSearchNavigate('/employees')}
                          className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3 transition">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {e.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium dark:text-white">{e.name}</p>
                            <p className="text-xs text-gray-400">{e.department} · {e.designation}</p>
                          </div>
                          <span className="text-xs text-gray-300 dark:text-gray-600">{e.employeeId}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.announcements?.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">Announcements</p>
                      {searchResults.announcements.map(a => (
                        <button key={a.id} onClick={() => handleSearchNavigate('/announcements')}
                          className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                          <p className="text-sm font-medium dark:text-white">{a.title}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {(!searchResults.employees?.length && !searchResults.announcements?.length) && (
                    <p className="px-4 py-8 text-center text-sm text-gray-400">No results found for "{searchQuery}"</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
