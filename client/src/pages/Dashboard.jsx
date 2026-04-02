import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Users, CalendarCheck, CalendarX, Clock, TrendingUp, TrendingDown,
  Megaphone, PartyPopper, ChevronRight, Receipt, DoorOpen, Cake,
  UserMinus, Zap, BarChart3, PieChart, Gift, Activity, CheckCircle2,
  AlertCircle, LogIn, FileText, CreditCard, User, Calendar, Inbox
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

/* ───────── Animated Number ───────── */
function AnimatedNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);

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

/* ───────── Live Clock with pulse animation ───────── */
function LiveClock({ large }) {
  const [time, setTime] = useState(new Date());
  const [tick, setTick] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setTick(t => !t);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (large) {
    return (
      <div className="flex items-center gap-1 font-mono">
        <span className="text-3xl font-bold text-white">
          {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).split(':')[0]}
        </span>
        <span className={`text-3xl font-bold text-white/80 transition-opacity duration-500 ${tick ? 'opacity-100' : 'opacity-30'}`}>:</span>
        <span className="text-3xl font-bold text-white">
          {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).split(':')[1]}
        </span>
        <span className="text-sm font-semibold text-white/60 ml-1 self-end mb-1">
          {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).split(' ')[1]}
        </span>
      </div>
    );
  }

  return (
    <span className="font-mono text-lg font-semibold text-indigo-600 dark:text-indigo-400">
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
    </span>
  );
}

/* ───────── SVG Circular Progress ───────── */
function CircularProgress({ value, max, size = 120, strokeWidth = 10, color = '#6366f1', bgColor, label, sublabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - pct * circumference;
  const bg = bgColor || 'rgba(255,255,255,0.15)';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bg} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold text-white">{Math.round(pct * 100)}%</span>
        {label && <span className="text-[10px] text-white/70 font-medium">{label}</span>}
      </div>
      {sublabel && <span className="text-xs text-white/60 mt-1">{sublabel}</span>}
    </div>
  );
}

/* ───────── Mini Sparkline ───────── */
function MiniSparkline({ data, color = '#6366f1' }) {
  if (!data || data.length < 2) return null;
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color.replace('#', '')})`} dot={false} isAnimationActive={true} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ───────── Greeting ───────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/* ───────── Generate fake sparkline data for stats (visual only) ───────── */
function generateSparkData(current) {
  const base = Math.max(1, current * 0.6);
  return Array.from({ length: 7 }, (_, i) =>
    Math.round(base + Math.random() * (current - base) * (1 + i * 0.1))
  );
}

/* ═══════════════════ DASHBOARD ═══════════════════ */
export default function Dashboard() {
  const { user, isAdmin, isManager } = useAuth();
  const [stats, setStats] = useState({});
  const [myAttendance, setMyAttendance] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [celebrations, setCelebrations] = useState({
    anniversaries: [], birthdays: [], todayBirthdays: [], todayAnniversaries: [],
    upcomingBirthdays: [], upcomingAnniversaries: []
  });
  const [analytics, setAnalytics] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const promises = [];
    if (isAdmin) {
      promises.push(api.get('/employees/stats/dashboard').then(r => setStats(r.data)));
      promises.push(api.get('/leaves/all-applications').then(r => setRecentLeaves(r.data.slice(0, 5))));
      promises.push(
        api.get('/attendance/today').then(r => setTodayAttendance(r.data)).catch(() => setTodayAttendance(null))
      );
    } else {
      promises.push(api.get('/leaves/my-applications').then(r => setRecentLeaves(r.data.slice(0, 5))));
    }
    promises.push(api.get('/announcements').then(r => setAnnouncements(r.data.slice(0, 3))).catch(() => {}));
    promises.push(api.get('/employees/stats/celebrations').then(r => setCelebrations(r.data)).catch(() => {}));
    if (isAdmin) {
      promises.push(api.get('/employees/stats/analytics').then(r => setAnalytics(r.data)).catch(() => {}));
    }

    const today = new Date().toISOString().split('T')[0];
    promises.push(
      api.get('/attendance/my', { params: { month: new Date().getMonth() + 1, year: new Date().getFullYear() } })
        .then(r => {
          const todayRec = r.data.find(a => a.date === today);
          setMyAttendance(todayRec);
        })
    );

    Promise.allSettled(promises).finally(() => setLoading(false));
  }, [isAdmin]);

  /* Build activity feed from available data once loaded */
  useEffect(() => {
    if (loading || !isAdmin) return;
    const feed = [];
    if (Array.isArray(todayAttendance)) {
      todayAttendance.filter(r => r.checkIn).slice(0, 5).forEach(r => {
        feed.push({
          type: 'checkin', icon: LogIn, color: 'text-emerald-500',
          text: `${r.name || 'Employee'} checked in`,
          time: r.checkIn, ts: new Date(`${new Date().toISOString().split('T')[0]}T${r.checkIn || '00:00'}`)
        });
      });
    }
    recentLeaves.slice(0, 3).forEach(l => {
      feed.push({
        type: 'leave', icon: FileText, color: 'text-amber-500',
        text: `${l.employeeName || 'Employee'} applied for ${l.leaveType} leave`,
        time: l.fromDate, ts: new Date(l.createdAt || l.fromDate)
      });
    });
    feed.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    setActivityFeed(feed.slice(0, 8));
  }, [loading, isAdmin, todayAttendance, recentLeaves]);

  /* Stat card definitions */
  const statCards = isAdmin ? [
    { label: 'Total Employees', value: stats.totalEmployees || 0, icon: Users, gradient: 'stat-card-blue', iconColor: 'text-blue-600 dark:text-blue-400', sparkColor: '#3b82f6', trend: 2.4, trendUp: true },
    { label: 'Present Today', value: stats.presentToday || 0, icon: CalendarCheck, gradient: 'stat-card-emerald', iconColor: 'text-emerald-600 dark:text-emerald-400', sparkColor: '#10b981', trend: 5.1, trendUp: true },
    { label: 'On Leave', value: stats.onLeaveToday || 0, icon: CalendarX, gradient: 'stat-card-amber', iconColor: 'text-amber-600 dark:text-amber-400', sparkColor: '#f59e0b', trend: 1.2, trendUp: false },
    { label: 'Pending Leaves', value: stats.pendingLeaves || 0, icon: Clock, gradient: 'stat-card-purple', iconColor: 'text-purple-600 dark:text-purple-400', sparkColor: '#8b5cf6', trend: 3.8, trendUp: true },
    { label: 'Pending Expenses', value: stats.pendingExpenses || 0, icon: Receipt, gradient: 'stat-card-blue', iconColor: 'text-blue-600 dark:text-blue-400', sparkColor: '#3b82f6', trend: 0.5, trendUp: false },
    { label: 'Pending Exits', value: stats.pendingExits || 0, icon: DoorOpen, gradient: 'stat-card-amber', iconColor: 'text-amber-600 dark:text-amber-400', sparkColor: '#f59e0b', trend: 0, trendUp: false },
  ] : [];

  const handleCheckIn = async () => {
    try {
      const res = await api.post('/attendance/checkin');
      setMyAttendance(prev => ({ ...prev, checkIn: new Date().toTimeString().slice(0, 5), status: res.data.status }));
      toast.success('Checked in successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await api.post('/attendance/checkout');
      setMyAttendance(prev => ({ ...prev, checkOut: new Date().toTimeString().slice(0, 5), workHours: res.data.workHours }));
      toast.success('Checked out successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-out failed');
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

  /* ───── Derived data for pulse ───── */
  const totalEmp = stats.totalEmployees || 0;
  const presentCount = stats.presentToday || 0;
  const pendingApprovals = (stats.pendingLeaves || 0) + (stats.pendingExpenses || 0) + (stats.pendingExits || 0);
  const checkedInLive = Array.isArray(todayAttendance) ? todayAttendance.filter(r => r.checkIn).length : presentCount;

  /* ═══════════════════ LOADING SKELETON ═══════════════════ */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="skeleton h-32 rounded-2xl" />

        {/* Pulse section skeleton (admin) */}
        {isAdmin && (
          <div className="skeleton h-44 rounded-2xl" />
        )}

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
        </div>

        {/* Stat cards skeleton */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
          </div>
        )}

        {/* Main grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton h-72 rounded-xl" />
          ))}
        </div>

        {/* Activity feed skeleton */}
        {isAdmin && <div className="skeleton h-64 rounded-xl" />}

        {/* Analytics skeleton */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1,2].map(i => <div key={i} className="skeleton h-56 rounded-xl" />)}
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div className="space-y-6">

      {/* ───── Page Header ───── */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1>{getGreeting()}, {user?.name?.split(' ')[0]}!</h1>
            <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
            <Clock size={16} className="text-indigo-200" />
            <LiveClock />
          </div>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
          <TrendingUp size={120} className="text-white" />
        </div>
      </div>

      {/* ───── Today's Pulse (Admin Only) ───── */}
      {isAdmin && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 dark:from-indigo-800 dark:via-purple-800 dark:to-fuchsia-800 p-6 shadow-xl animate-slide-up">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white" />
            <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-white" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-5">
              <Activity size={20} className="text-white/80" />
              <h2 className="text-lg font-bold text-white">Today's Pulse</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Attendance Rate Circular */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <CircularProgress
                    value={presentCount} max={totalEmp || 1} size={110} strokeWidth={10}
                    color="#34d399" label={`${presentCount}/${totalEmp}`} sublabel="Attendance Rate"
                  />
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-2">
                  <AlertCircle size={28} className="text-amber-300" />
                </div>
                <span className="text-3xl font-bold text-white">
                  <AnimatedNumber value={pendingApprovals} />
                </span>
                <span className="text-xs text-white/60 mt-1">Pending Approvals</span>
                <Link to="/approvals" className="mt-2 text-[10px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-0.5 transition-colors">
                  Review Now <ChevronRight size={12} />
                </Link>
              </div>

              {/* Live Check-ins */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-2">
                  <CheckCircle2 size={28} className="text-emerald-300" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-3xl font-bold text-white">
                  <AnimatedNumber value={checkedInLive} />
                </span>
                <span className="text-xs text-white/60 mt-1">Checked In Live</span>
              </div>

              {/* Current Time */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-2">
                  <Clock size={28} className="text-indigo-200" />
                </div>
                <LiveClock large />
                <span className="text-xs text-white/60 mt-1">Current Time</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───── Quick Actions ───── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Apply Leave', to: '/leaves', icon: CalendarX, color: 'from-indigo-500 to-purple-500' },
          { label: 'Submit Expense', to: '/expenses', icon: Receipt, color: 'from-emerald-500 to-teal-500' },
          { label: 'My Payslips', to: '/payslips', icon: Zap, color: 'from-amber-500 to-orange-500' },
          { label: 'Messages', to: '/messages', icon: Megaphone, color: 'from-pink-500 to-rose-500' },
          { label: 'My Space', to: '/my-space', icon: User, color: 'from-cyan-500 to-blue-500' },
          { label: 'Team Calendar', to: '/team-calendar', icon: Calendar, color: 'from-violet-500 to-fuchsia-500' },
        ].map((a, i) => (
          <Link key={a.label} to={a.to} className={`group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${a.color} text-white hover:shadow-lg hover:shadow-${a.color.split('-')[1]}-500/25 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 animate-slide-up`} style={{ animationDelay: `${i * 50}ms` }}>
            <a.icon size={18} className="group-hover:rotate-6 transition-transform" />
            <span className="text-sm font-medium truncate">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* ───── Admin Stats with Sparklines ───── */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statCards.map((s, i) => (
            <div key={s.label} className={`group ${s.gradient} rounded-xl p-4 pb-2 border border-white/50 dark:border-slate-700 shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-300 animate-slide-up cursor-default relative overflow-hidden`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">
                    <AnimatedNumber value={s.value} />
                  </p>
                  <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-0.5">{s.label}</p>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 group-hover:scale-110 transition-transform">
                  <s.icon size={18} className={s.iconColor} />
                </div>
              </div>
              {/* Trend indicator */}
              {s.trend > 0 && (
                <div className="flex items-center gap-1 mb-1">
                  {s.trendUp ? (
                    <TrendingUp size={12} className="text-emerald-500" />
                  ) : (
                    <TrendingDown size={12} className="text-red-400" />
                  )}
                  <span className={`text-[10px] font-semibold ${s.trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {s.trendUp ? '+' : '-'}{s.trend}%
                  </span>
                  <span className="text-[9px] text-slate-400">vs last week</span>
                </div>
              )}
              {/* Mini sparkline */}
              <div className="mt-1 -mx-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <MiniSparkline data={generateSparkData(s.value)} color={s.sparkColor} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ───── Who's on leave today ───── */}
      {isAdmin && stats.onLeaveNames?.length > 0 && (
        <div className="card bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-100 dark:border-amber-800/30 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <UserMinus size={18} className="text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">On Leave Today</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.onLeaveNames.map((e, i) => (
              <span key={i} className="px-3 py-1 bg-white/60 dark:bg-slate-800/40 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800/60 transition-colors">
                {e.name} <span className="text-slate-400">· {e.department}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ───── Main 3-column grid ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Card */}
        <div className="card card-interactive animate-slide-up">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <CalendarCheck size={20} className="text-indigo-600 dark:text-indigo-400" /> Today's Attendance
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
              <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
              <span className={`badge ${myAttendance?.checkIn ? (myAttendance.status === 'late' ? 'badge-warning' : 'badge-success') : 'badge-gray'}`}>
                {myAttendance?.checkIn ? myAttendance.status?.toUpperCase() : 'NOT CHECKED IN'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
              <span className="text-sm text-slate-500 dark:text-slate-400">Check In</span>
              <span className="text-sm font-medium dark:text-white">{myAttendance?.checkIn || '--:--'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
              <span className="text-sm text-slate-500 dark:text-slate-400">Check Out</span>
              <span className="text-sm font-medium dark:text-white">{myAttendance?.checkOut || '--:--'}</span>
            </div>
            {myAttendance?.workHours && (
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                <span className="text-sm text-slate-500 dark:text-slate-400">Work Hours</span>
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
              {myAttendance?.checkIn && myAttendance?.checkOut && (
                <div className="flex-1 text-center py-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  Day Complete
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Leaves */}
        <div className="card card-interactive animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <CalendarX size={20} className="text-indigo-600 dark:text-indigo-400" /> Recent Leaves
            </h2>
            <Link to="/leaves" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {recentLeaves.length === 0 ? (
            <div className="empty-state py-8">
              <CalendarX size={48} />
              <p>No leave applications</p>
              <Link to="/leaves" className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Apply Leave</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLeaves.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition">
                  <div>
                    {isAdmin && <p className="text-sm font-medium text-slate-800 dark:text-white">{l.employeeName}</p>}
                    <p className="text-xs text-slate-500 dark:text-slate-400">{l.leaveType} &middot; {l.fromDate} to {l.toDate}</p>
                  </div>
                  <span className={`badge ${l.status === 'approved' ? 'badge-success' : l.status === 'rejected' ? 'badge-danger' : l.status === 'pending_hr' ? 'badge-info' : 'badge-warning'}`}>
                    {l.status === 'pending_manager' ? 'Pending Manager' : l.status === 'pending_hr' ? 'Pending HR' : l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements Widget */}
        <div className="card card-interactive animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Megaphone size={20} className="text-indigo-600 dark:text-indigo-400" /> Announcements
            </h2>
            <Link to="/announcements" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {announcements.length === 0 ? (
            <div className="empty-state py-8">
              <Megaphone size={48} />
              <p>No announcements</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge text-[10px] ${priorityColor(a.priority)}`}>{a.priority}</span>
                    <span className="text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{a.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ───── Activity Feed (Admin Only) ───── */}
      {isAdmin && activityFeed.length > 0 && (
        <div className="card animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Activity Feed</h2>
          </div>
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-3">
              {activityFeed.map((item, i) => (
                <div key={i} className="flex items-start gap-4 pl-1 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="relative z-10 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 ring-4 ring-white dark:ring-slate-900">
                    <item.icon size={14} className={item.color} />
                  </div>
                  <div className="flex-1 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{item.text}</p>
                    <span className="text-[10px] text-slate-400 ml-3 flex-shrink-0">{item.time || '--'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───── Today's Celebrations Banner ───── */}
      {(celebrations.todayBirthdays?.length > 0 || celebrations.todayAnniversaries?.length > 0) && (
        <div className="card animate-slide-up bg-gradient-to-r from-yellow-50 via-pink-50 to-purple-50 dark:from-yellow-900/20 dark:via-pink-900/20 dark:to-purple-900/20 border-yellow-200 dark:border-yellow-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={20} className="text-yellow-500" />
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Today's Celebrations</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {celebrations.todayBirthdays?.map((b, i) => (
              <div key={'tb'+i} className="flex items-center gap-2 px-3 py-2 bg-white/70 dark:bg-slate-800/50 rounded-xl border border-pink-200 dark:border-pink-800/30">
                <Cake size={16} className="text-pink-500" />
                <span className="text-sm font-medium text-slate-800 dark:text-white">{b.name}</span>
                <span className="text-xs text-pink-500">Birthday</span>
              </div>
            ))}
            {celebrations.todayAnniversaries?.map((a, i) => (
              <div key={'ta'+i} className="flex items-center gap-2 px-3 py-2 bg-white/70 dark:bg-slate-800/50 rounded-xl border border-amber-200 dark:border-amber-800/30">
                <PartyPopper size={16} className="text-amber-500" />
                <span className="text-sm font-medium text-slate-800 dark:text-white">{a.name}</span>
                <span className="text-xs text-amber-500">{a.years} yr{a.years > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───── Admin Analytics Widgets ───── */}
      {isAdmin && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
          {/* Department Distribution */}
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-indigo-600 dark:text-indigo-400" /> Department Distribution
            </h2>
            <div className="space-y-3">
              {analytics.deptWise?.map((d, i) => {
                const total = analytics.deptWise.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'];
                return (
                  <div key={d.department} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-24 truncate">{d.department}</span>
                    <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500 flex items-center justify-end pr-2`} style={{ width: `${pct}%` }}>
                        {pct > 15 && <span className="text-[10px] text-white font-medium">{d.count}</span>}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave Usage Overview */}
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-600 dark:text-indigo-400" /> Leave Usage Overview
            </h2>
            <div className="space-y-3">
              {analytics.leaveUsage?.map((l, i) => {
                const pct = l.total > 0 ? Math.round((l.used / l.total) * 100) : 0;
                const colors = ['from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-purple-500 to-pink-500', 'from-amber-500 to-orange-500', 'from-indigo-500 to-violet-500', 'from-rose-500 to-red-500'];
                return (
                  <div key={l.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">{l.name}</span>
                      <span className="text-slate-500">{l.used}/{l.total} used</span>
                    </div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Attendance */}
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <CalendarCheck size={20} className="text-emerald-600 dark:text-emerald-400" /> Top Attendance This Month
            </h2>
            <div className="space-y-2">
              {analytics.topAttendance?.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{a.name}</p>
                      <p className="text-[10px] text-slate-400">{a.department}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{a.presentDays} days</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expense by Category */}
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Receipt size={20} className="text-amber-600 dark:text-amber-400" /> Expense by Category
            </h2>
            <div className="space-y-3">
              {analytics.expenseByCategory?.filter(e => e.total > 0).map((e, i) => {
                const max = Math.max(...analytics.expenseByCategory.map(x => x.total));
                const pct = max > 0 ? Math.round((e.total / max) * 100) : 0;
                return (
                  <div key={e.category} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-20 truncate">{e.category}</span>
                    <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-16 text-right">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(e.total)}
                    </span>
                  </div>
                );
              })}
              {analytics.expenseByCategory?.filter(e => e.total > 0).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No expense data yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───── Upcoming Celebrations (next 7 days) ───── */}
      {(celebrations.upcomingBirthdays?.length > 0 || celebrations.upcomingAnniversaries?.length > 0) && (
        <div className="card animate-slide-up bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border-violet-100 dark:border-violet-800/30">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Gift size={20} className="text-violet-500" /> Upcoming This Week
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {celebrations.upcomingBirthdays?.map((b, i) => (
              <div key={'ub'+i} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/40 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm">
                  {b.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{b.name}</p>
                  <p className="text-xs text-pink-500">Birthday - {new Date(b.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            ))}
            {celebrations.upcomingAnniversaries?.map((a, i) => (
              <div key={'ua'+i} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/40 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  {a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{a.name}</p>
                  <p className="text-xs text-amber-500">{a.years} yr{a.years > 1 ? 's' : ''} - {new Date(a.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───── Birthdays ───── */}
      {celebrations.birthdays?.length > 0 && (
        <div className="card animate-slide-up bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-100 dark:border-pink-800/30">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Cake size={20} className="text-pink-500" /> Birthdays This Month
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {celebrations.birthdays.map((b, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/40 rounded-xl hover:bg-white dark:hover:bg-slate-800/60 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm">
                  {b.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{b.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(b.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} &middot; {b.department}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───── Work Anniversaries ───── */}
      {celebrations.anniversaries?.length > 0 && (
        <div className="card animate-slide-up">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <PartyPopper size={20} className="text-amber-500" /> Work Anniversaries This Month
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {celebrations.anniversaries.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  {a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{a.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.years} year{a.years > 1 ? 's' : ''} &middot; {a.department}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
