import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarCheck, CalendarX, Clock, Target, Award, Briefcase, Download,
  FileText, Send, FolderOpen, ChevronRight, Star, TrendingUp, User,
  Zap, BookOpen, BarChart3, CreditCard, CircleDot, Layers
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts';

// ---------------------------------------------------------------------------
// Circular Progress Ring (SVG)
// ---------------------------------------------------------------------------
function CircularProgress({ value = 0, max = 100, size = 120, strokeWidth = 10, color = '#6366f1', label, sublabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedOffset(circumference * (1 - pct));
    }, 200);
    return () => clearTimeout(timeout);
  }, [pct, circumference]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth={strokeWidth}
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth={strokeWidth}
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>
      {label && <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>}
      {sublabel && <span className="text-xs text-gray-500 dark:text-gray-400">{sublabel}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated slide-up wrapper
// ---------------------------------------------------------------------------
function SlideUp({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Stat Card
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, color, iconBg }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Card wrapper
// ---------------------------------------------------------------------------
function SectionCard({ title, icon: Icon, children, action, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-indigo-500" />}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini progress bar
// ---------------------------------------------------------------------------
function MiniProgress({ value, max, color = 'bg-indigo-500' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function MySpace() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    const promises = [
      api.get('/auth/me').then(r => setProfile(r.data)).catch(() => {}),
      api.get('/attendance/my', { params: { month, year } }).then(r => setAttendance(r.data || [])).catch(() => {}),
      api.get('/leaves/balance').then(r => setLeaveBalance(r.data || [])).catch(() => {}),
      api.get('/salary/my-payslips').then(r => setPayslips(r.data || [])).catch(() => {}),
      api.get('/performance/my-goals').then(r => setGoals(r.data || [])).catch(() => {}),
      api.get('/performance/my-reviews').then(r => setReviews(r.data || [])).catch(() => {}),
      api.get('/training/my-skills').then(r => setSkills(r.data || [])).catch(() => {}),
    ];
    Promise.allSettled(promises).finally(() => setLoading(false));
  }, [month, year]);

  // ---- Derived data ----
  const emp = profile || user || {};
  const empName = emp.name || (emp.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Employee');
  const empDesignation = emp.designation || emp.position || '';
  const empDepartment = emp.department?.name || emp.department || '';
  const empId = emp.employeeId || emp._id || '';
  const avatarUrl = emp.avatar || emp.profileImage || null;

  // Attendance stats
  const presentDays = attendance.filter(a => a.status === 'Present' || a.status === 'present').length;
  const lateDays = attendance.filter(a => a.status === 'Late' || a.status === 'late' || a.isLate).length;
  const absentDays = attendance.filter(a => a.status === 'Absent' || a.status === 'absent').length;
  const halfDays = attendance.filter(a => a.status === 'Half Day' || a.status === 'half-day' || a.isHalfDay).length;
  const workingDays = Math.max(presentDays + absentDays + lateDays + halfDays, 1);
  const attendanceRate = ((presentDays + lateDays + halfDays * 0.5) / workingDays) * 100;

  // Leave balance
  const totalLeaves = leaveBalance.reduce((s, l) => s + (l.total || l.allocated || 0), 0);
  const usedLeaves = leaveBalance.reduce((s, l) => s + (l.used || 0), 0);
  const leaveUsagePct = totalLeaves > 0 ? (usedLeaves / totalLeaves) * 100 : 0;

  // Goals
  const goalsCompletion = goals.length > 0
    ? goals.reduce((s, g) => s + (g.progress || g.completion || 0), 0) / goals.length
    : 0;

  // Performance rating
  const latestReview = reviews.length > 0 ? reviews[0] : null;
  const rating = latestReview?.rating || latestReview?.overallRating || 0;

  // Pending requests (leaves)
  const pendingRequests = leaveBalance.filter(l => l.pending).reduce((s, l) => s + l.pending, 0);

  // Area chart data for attendance
  const chartData = attendance
    .map(a => {
      const d = new Date(a.date);
      const checkIn = a.checkIn || a.clockIn || a.punchIn;
      let checkInMinutes = null;
      if (checkIn) {
        const t = new Date(checkIn);
        checkInMinutes = t.getHours() * 60 + t.getMinutes();
      }
      return {
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        day: d.getDate(),
        checkIn: checkInMinutes,
        status: a.status,
      };
    })
    .sort((a, b) => a.day - b.day);

  // Leave type colors
  const leaveColors = [
    { bg: 'bg-blue-50 dark:bg-blue-900/20', bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    { bg: 'bg-emerald-50 dark:bg-emerald-900/20', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    { bg: 'bg-amber-50 dark:bg-amber-900/20', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    { bg: 'bg-rose-50 dark:bg-rose-900/20', bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
    { bg: 'bg-violet-50 dark:bg-violet-900/20', bar: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400' },
    { bg: 'bg-cyan-50 dark:bg-cyan-900/20', bar: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
  ];

  const proficiencyBadge = (level) => {
    const map = {
      beginner: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      intermediate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      advanced: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      expert: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    };
    const key = (level || 'beginner').toLowerCase();
    return map[key] || map.beginner;
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading your space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ================================================================ */}
      {/* Profile Header with Gradient                                     */}
      {/* ================================================================ */}
      <SlideUp>
        <div className="relative rounded-2xl overflow-hidden shadow-lg">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTIgMGMwIDEuMS0uOSAyLTIgMnMtMi0uOS0yLTIgLjktMiAyLTIgMiAuOSAyIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

          <div className="relative px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white/30 shadow-xl overflow-hidden bg-white/20 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={empName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl sm:text-5xl font-bold text-white/90">
                      {empName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-400 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-white rounded-full" />
                </div>
              </div>

              {/* Info */}
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{empName}</h1>
                <p className="text-white/80 text-lg mt-1">{empDesignation}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                  {empDepartment && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium backdrop-blur-sm">
                      <Briefcase className="w-3.5 h-3.5" /> {empDepartment}
                    </span>
                  )}
                  {empId && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium backdrop-blur-sm">
                      <CircleDot className="w-3.5 h-3.5" /> {empId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SlideUp>

      {/* ================================================================ */}
      {/* Progress Rings                                                   */}
      {/* ================================================================ */}
      <SlideUp delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-center">
            <CircularProgress
              value={attendanceRate} max={100} color="#6366f1"
              label="Attendance" sublabel={`${presentDays}/${workingDays} days`}
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-center">
            <CircularProgress
              value={leaveUsagePct} max={100} color="#f59e0b"
              label="Leave Usage" sublabel={`${usedLeaves}/${totalLeaves} used`}
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-center">
            <CircularProgress
              value={goalsCompletion} max={100} color="#10b981"
              label="Goals" sublabel={`${goals.length} goals`}
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-center">
            <CircularProgress
              value={rating} max={5} size={120} color="#ec4899"
              label="Rating" sublabel={rating ? `${rating}/5 stars` : 'No review yet'}
            />
          </div>
        </div>
      </SlideUp>

      {/* ================================================================ */}
      {/* Quick Stats Row                                                  */}
      {/* ================================================================ */}
      <SlideUp delay={200}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={CalendarCheck} label="Days Present" value={presentDays} color="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/30" />
          <StatCard icon={CalendarX} label="Leaves Taken" value={usedLeaves} color="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-900/30" />
          <StatCard icon={Clock} label="Pending Requests" value={pendingRequests} color="text-blue-600" iconBg="bg-blue-50 dark:bg-blue-900/30" />
          <StatCard icon={Zap} label="Skills Count" value={skills.length} color="text-purple-600" iconBg="bg-purple-50 dark:bg-purple-900/30" />
        </div>
      </SlideUp>

      {/* ================================================================ */}
      {/* Main Grid - Attendance & Leave Balance                           */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Attendance This Month */}
        <SlideUp delay={300}>
          <SectionCard title="My Attendance This Month" icon={CalendarCheck}>
            {chartData.length > 0 ? (
              <div className="space-y-5">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="checkInGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-gray-500" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => {
                          const h = Math.floor(v / 60);
                          const m = v % 60;
                          return `${h}:${m.toString().padStart(2, '0')}`;
                        }}
                        domain={['dataMin - 30', 'dataMax + 30']}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        formatter={(v) => {
                          if (!v) return ['N/A', 'Check-in'];
                          const h = Math.floor(v / 60);
                          const m = v % 60;
                          const ampm = h >= 12 ? 'PM' : 'AM';
                          return [`${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${ampm}`, 'Check-in'];
                        }}
                      />
                      <Area type="monotone" dataKey="checkIn" stroke="#6366f1" strokeWidth={2.5} fill="url(#checkInGrad)" dot={{ r: 3, fill: '#6366f1' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Present', value: presentDays, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'Late', value: lateDays, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Absent', value: absentDays, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'Half Day', value: halfDays, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  ].map(s => (
                    <div key={s.label} className={`text-center p-3 rounded-xl ${s.bg}`}>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <CalendarCheck className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">No attendance data this month</p>
              </div>
            )}
          </SectionCard>
        </SlideUp>

        {/* My Leave Balance */}
        <SlideUp delay={400}>
          <SectionCard title="My Leave Balance" icon={CalendarX}>
            {leaveBalance.length > 0 ? (
              <div className="space-y-3">
                {leaveBalance.map((leave, i) => {
                  const c = leaveColors[i % leaveColors.length];
                  const total = leave.total || leave.allocated || 0;
                  const used = leave.used || 0;
                  const remaining = total - used;
                  return (
                    <div key={leave.leaveType || leave.type || i} className={`p-4 rounded-xl ${c.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-semibold ${c.text}`}>
                          {leave.leaveType || leave.type || leave.name || 'Leave'}
                        </span>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {remaining}/{total} remaining
                        </span>
                      </div>
                      <MiniProgress value={used} max={total} color={c.bar} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <CalendarX className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">No leave balance data available</p>
              </div>
            )}
          </SectionCard>
        </SlideUp>
      </div>

      {/* ================================================================ */}
      {/* Payslips & Goals                                                 */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Recent Payslips */}
        <SlideUp delay={500}>
          <SectionCard
            title="My Recent Payslips" icon={CreditCard}
            action={
              <Link to="/payslips" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            }
          >
            {payslips.length > 0 ? (
              <div className="space-y-3">
                {payslips.slice(0, 3).map((slip, i) => {
                  const period = slip.month && slip.year
                    ? new Date(slip.year, slip.month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                    : slip.period || slip.payPeriod || `Payslip ${i + 1}`;
                  return (
                    <div
                      key={slip._id || i}
                      className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{period}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Net Pay: <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(slip.netPay || slip.netSalary || slip.amount || 0)}
                            </span>
                          </p>
                        </div>
                      </div>
                      {(slip.downloadUrl || slip._id) && (
                        <button
                          onClick={() => {
                            const url = slip.downloadUrl || `/api/salary/download-payslip/${slip.id || slip._id}`;
                            window.open(url, '_blank');
                            toast.success('Downloading payslip...');
                          }}
                          className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 transition-colors"
                          title="Download Payslip"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <CreditCard className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">No payslips available</p>
              </div>
            )}
          </SectionCard>
        </SlideUp>

        {/* My Goals */}
        <SlideUp delay={600}>
          <SectionCard title="My Goals" icon={Target}>
            {goals.length > 0 ? (
              <div className="space-y-4">
                {goals.map((goal, i) => {
                  const progress = goal.progress || goal.completion || 0;
                  const colorMap = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];
                  const barColor = colorMap[i % colorMap.length];
                  return (
                    <div key={goal._id || i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[70%]">
                          {goal.title || goal.name || goal.description || `Goal ${i + 1}`}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{progress}%</span>
                      </div>
                      <MiniProgress value={progress} max={100} color={barColor} />
                      {goal.dueDate && (
                        <p className="text-xs text-gray-400 mt-1">
                          Due: {new Date(goal.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Target className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">No goals assigned yet</p>
              </div>
            )}
          </SectionCard>
        </SlideUp>
      </div>

      {/* ================================================================ */}
      {/* Skills & Quick Actions                                           */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Skills */}
        <SlideUp delay={700}>
          <SectionCard title="My Skills" icon={Zap}>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {skills.map((skill, i) => {
                  const name = skill.name || skill.skill || skill.title || `Skill ${i + 1}`;
                  const level = skill.proficiency || skill.level || 'Intermediate';
                  return (
                    <div
                      key={skill._id || i}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                    >
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${proficiencyBadge(level)}`}>
                        {level}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <BookOpen className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">No skills recorded yet</p>
              </div>
            )}
          </SectionCard>
        </SlideUp>

        {/* Quick Actions */}
        <SlideUp delay={800}>
          <SectionCard title="Quick Actions" icon={Layers}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Apply Leave', icon: CalendarX, to: '/leaves', color: 'from-blue-500 to-indigo-600', hoverColor: 'hover:shadow-blue-200 dark:hover:shadow-blue-900/40' },
                { label: 'Submit Expense', icon: Send, to: '/expenses', color: 'from-emerald-500 to-teal-600', hoverColor: 'hover:shadow-emerald-200 dark:hover:shadow-emerald-900/40' },
                { label: 'View Payslips', icon: CreditCard, to: '/payslips', color: 'from-amber-500 to-orange-600', hoverColor: 'hover:shadow-amber-200 dark:hover:shadow-amber-900/40' },
                { label: 'View Documents', icon: FolderOpen, to: '/documents', color: 'from-pink-500 to-rose-600', hoverColor: 'hover:shadow-pink-200 dark:hover:shadow-pink-900/40' },
              ].map(action => (
                <Link
                  key={action.label}
                  to={action.to}
                  className={`group flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-br ${action.color} text-white shadow-md ${action.hoverColor} hover:shadow-lg hover:scale-[1.03] transition-all duration-200`}
                >
                  <action.icon className="w-7 h-7 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-center">{action.label}</span>
                </Link>
              ))}
            </div>
          </SectionCard>
        </SlideUp>
      </div>
    </div>
  );
}
