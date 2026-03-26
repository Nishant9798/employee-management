import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  // Global search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    api.get('/notifications/unread-count').then(r => setUnreadCount(r.data.count)).catch(() => {});
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
  };

  const markAsRead = async (id) => {
    await api.put(`/notifications/read/${id}`);
    loadNotifications();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    loadNotifications();
  };

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
      if (searchRef.current && !searchRef.current.contains(e.target)) { setShowSearch(false); setSearchResults(null); }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const notifIcon = (type) => {
    switch (type) {
      case 'leave': return '📋';
      case 'expense': return '💰';
      case 'performance': return '⭐';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'error': return '❌';
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
    return `${days}d ago`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <Menu size={22} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-bold text-indigo-800 dark:text-indigo-400 lg:hidden">EMS</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div ref={searchRef} className="relative hidden sm:block">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5">
                <Search size={16} className="text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Search employees, announcements..."
                  className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none w-48 lg:w-64 placeholder-gray-400"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults(null); }}>
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearch && searchResults && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 overflow-hidden z-50">
                  {searchResults.employees?.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">Employees</p>
                      {searchResults.employees.map(e => (
                        <button key={e.id} onClick={() => { navigate('/employees'); setShowSearch(false); setSearchQuery(''); }}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {e.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium dark:text-white">{e.name}</p>
                            <p className="text-xs text-gray-400">{e.department} · {e.designation}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.announcements?.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">Announcements</p>
                      {searchResults.announcements.map(a => (
                        <button key={a.id} onClick={() => { navigate('/announcements'); setShowSearch(false); setSearchQuery(''); }}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                          <p className="text-sm font-medium dark:text-white">{a.title}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {(!searchResults.employees?.length && !searchResults.announcements?.length) && (
                    <p className="px-4 py-6 text-center text-sm text-gray-400">No results found</p>
                  )}
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div ref={notifRef} className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifs && (
                <div className="absolute top-full mt-2 right-0 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
                    <h3 className="font-semibold dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-gray-400">No notifications</p>
                    ) : (
                      notifications.slice(0, 15).map(n => (
                        <button key={n.id} onClick={() => { if (n.link) navigate(n.link); markAsRead(n.id); setShowNotifs(false); }}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex gap-3 transition border-b dark:border-gray-700/50 last:border-0 ${!n.isRead ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                          <span className="text-lg shrink-0 mt-0.5">{notifIcon(n.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{n.message}</p>
                            <p className="text-[10px] text-gray-300 dark:text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                          {!n.isRead && <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-2" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              Welcome, <span className="font-semibold text-gray-800 dark:text-white">{user?.name?.split(' ')[0]}</span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
