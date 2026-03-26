import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Users, CalendarCheck, CalendarX, Clock, TrendingUp, Megaphone, PartyPopper, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function AnimatedNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    let start = 0;
    const end = Number(value) || 0;
    if (end === 0) { setDisplay(0); return; }
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{display}</span>;
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({});
  const [myAttendance, setMyAttendance] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [celebrations, setCelebrations] = useState({ anniversaries: [] });

  useEffect(() => {
    if (isAdmin) {
      api.get('/employees/stats/dashboard').then(r => setStats(r.data));
      api.get('/leaves/all-applications').then(r => setRecentLeaves(r.data.slice(0, 5)));
    } else {
      api.get('/leaves/my-applications').then(r => setRecentLeaves(r.data.slice(0, 5)));
    }
    api.get('/announcements').then(r => setAnnouncements(r.data.slice(0, 3))).catch(() => {});
    api.get('/employees/stats/celebrations').then(r => setCelebrations(r.data)).catch(() => {});

    const today = new Date().toISOString().split('T')[0];
    api.get('/attendance/my', { params: { month: new Date().getMonth() + 1, year: new Date().getFullYear() } })
      .then(r => {
        const todayRec = r.data.find(a => a.date === today);
        setMyAttendance(todayRec);
      });
  }, [isAdmin]);

  const statCards = isAdmin ? [
    { label: 'Total Employees', value: stats.totalEmployees || 0, icon: Users, gradient: 'stat-card-blue', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Present Today', value: stats.presentToday || 0, icon: CalendarCheck, gradient: 'stat-card-emerald', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'On Leave', value: stats.onLeaveToday || 0, icon: CalendarX, gradient: 'stat-card-amber', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Pending Leaves', value: stats.pendingLeaves || 0, icon: Clock, gradient: 'stat-card-purple', iconColor: 'text-purple-600 dark:text-purple-400' },
  ] : [];

  const handleCheckIn = async () => {
    try {
      const res = await api.post('/attendance/checkin');
      setMyAttendance(prev => ({ ...prev, checkIn: new Date().toTimeString().slice(0, 5), status: res.data.status }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await api.post('/attendance/checkout');
      setMyAttendance(prev => ({ ...prev, checkOut: new Date().toTimeString().slice(0, 5), workHours: res.data.workHours }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const priorityColor = (p) => {
    switch (p) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'normal': return 'priority-normal';
      default: return 'priority-low';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10">
          <h1>Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
          <TrendingUp size={120} className="text-white" />
        </div>
      </div>

      {/* Admin Stats */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <div key={s.label} className={`${s.gradient} rounded-xl p-5 border border-white/50 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 animate-slide-up`} style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white animate-count-up">
                    <AnimatedNumber value={s.value} />
                  </p>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">{s.label}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/60 dark:bg-gray-800/60">
                  <s.icon size={24} className={s.iconColor} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Card */}
        <div className="card animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <CalendarCheck size={20} className="text-indigo-600 dark:text-indigo-400" /> Today's Attendance
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              <span className={`badge ${myAttendance?.checkIn ? (myAttendance.status === 'late' ? 'badge-warning' : 'badge-success') : 'badge-gray'}`}>
                {myAttendance?.checkIn ? myAttendance.status?.toUpperCase() : 'NOT CHECKED IN'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Check In</span>
              <span className="text-sm font-medium dark:text-white">{myAttendance?.checkIn || '--:--'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Check Out</span>
              <span className="text-sm font-medium dark:text-white">{myAttendance?.checkOut || '--:--'}</span>
            </div>
            {myAttendance?.workHours && (
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Work Hours</span>
                <span className="text-sm font-medium dark:text-white">{myAttendance.workHours}h</span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              {!myAttendance?.checkIn && (
                <button onClick={handleCheckIn} className="btn-success flex-1">Check In</button>
              )}
              {myAttendance?.checkIn && !myAttendance?.checkOut && (
                <button onClick={handleCheckOut} className="btn-danger flex-1">Check Out</button>
              )}
            </div>
          </div>
        </div>

        {/* Recent Leaves */}
        <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <CalendarX size={20} className="text-indigo-600 dark:text-indigo-400" /> Recent Leaves
            </h2>
            <Link to="/leaves" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {recentLeaves.length === 0 ? (
            <div className="empty-state py-8">
              <CalendarX size={48} />
              <p className="text-sm">No leave applications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLeaves.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <div>
                    {isAdmin && <p className="text-sm font-medium text-gray-800 dark:text-white">{l.employeeName}</p>}
                    <p className="text-xs text-gray-500 dark:text-gray-400">{l.leaveType} &middot; {l.fromDate} to {l.toDate}</p>
                  </div>
                  <span className={`badge ${l.status === 'approved' ? 'badge-success' : l.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements Widget */}
        <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Megaphone size={20} className="text-indigo-600 dark:text-indigo-400" /> Announcements
            </h2>
            <Link to="/announcements" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {announcements.length === 0 ? (
            <div className="empty-state py-8">
              <Megaphone size={48} />
              <p className="text-sm">No announcements</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge text-[10px] ${priorityColor(a.priority)}`}>{a.priority}</span>
                    <span className="text-[10px] text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{a.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Celebrations */}
      {celebrations.anniversaries?.length > 0 && (
        <div className="card animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <PartyPopper size={20} className="text-amber-500" /> Work Anniversaries This Month
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {celebrations.anniversaries.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  {a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{a.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.years} year{a.years > 1 ? 's' : ''} &middot; {a.department}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
