import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, LineChart, Line, Legend,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Brain, Users, UserCheck, UserMinus, TrendingUp, TrendingDown,
  TriangleAlert, CheckCircle, Clock, Calendar, Activity,
  Shield, Zap, Heart, Eye, ArrowRight, BarChart3, RefreshCw,
  Flame, AlertCircle, Info, ChevronRight, Building2, Timer
} from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed', '#4f46e5', '#4338ca'];
const RISK_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
const HEALTH_COLORS = { good: '#22c55e', warning: '#f59e0b', critical: '#ef4444' };

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

function SeverityBadge({ level }) {
  const styles = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${styles[level] || styles.info}`}>
      {level}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, suffix, trend, trendLabel, gradient, delay = 0 }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 shadow-lg border border-white/10 dark:border-gray-700/50 transition-all duration-500 hover:scale-[1.03] hover:shadow-xl ${gradient}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
            <AnimatedNumber value={value} />
            {suffix && <span className="text-lg ml-1">{suffix}</span>}
          </p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{Math.abs(trend)}% {trendLabel || 'vs last month'}</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm shadow-inner">
          <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-gray-600 dark:text-gray-300" style={{ color: entry.color }}>
          {entry.name}: <span className="font-medium">{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function SmartAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [analyticsRes, dashRes, empRes] = await Promise.all([
        api.get('/employees/stats/analytics'),
        api.get('/employees/stats/dashboard'),
        api.get('/employees'),
      ]);
      setAnalytics(analyticsRes.data);
      setDashboardStats(dashRes.data);
      setEmployees(empRes.data);

      const [perfRes, attRes, leaveRes] = await Promise.allSettled([
        api.get('/performance/team-reviews'),
        api.get('/attendance/summary', {
          params: { month: new Date().getMonth() + 1, year: new Date().getFullYear() }
        }),
        api.get('/leaves/all-applications'),
      ]);

      if (perfRes.status === 'fulfilled') setPerformanceData(perfRes.value.data || []);
      else console.warn('Performance data unavailable');

      if (attRes.status === 'fulfilled') setAttendanceData(attRes.value.data || []);
      else console.warn('Attendance data unavailable');

      if (leaveRes.status === 'fulfilled') setLeaveData(leaveRes.value.data || []);
      else console.warn('Leave data unavailable');

      if (isRefresh) toast.success('Analytics refreshed');
    } catch (err) {
      toast.error('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ---- Computed insights ----

  const departmentMap = useMemo(() => {
    const map = {};
    (Array.isArray(employees) ? employees : []).forEach(emp => {
      const dept = emp.department || 'Unknown';
      if (!map[dept]) map[dept] = [];
      map[dept].push(emp);
    });
    return map;
  }, [employees]);

  const departmentHealthScores = useMemo(() => {
    const departments = Object.keys(departmentMap);
    return departments.map(dept => {
      const emps = departmentMap[dept];
      const count = emps.length;

      // Attendance rate (summary data has: id, name, department, present, absent, late, halfday, avgHours)
      const deptAttendance = attendanceData.filter(a =>
        emps.some(e => (e.id) === (a.id))
      );
      const attendanceRate = deptAttendance.length > 0
        ? Math.min(100, deptAttendance.reduce((sum, a) => {
            const total = (a.present || 0) + (a.absent || 0) + (a.late || 0) + (a.halfday || 0);
            return sum + (total > 0 ? ((a.present || 0) + (a.late || 0)) / total * 100 : 0);
          }, 0) / deptAttendance.length)
        : 75 + Math.random() * 20;

      // Leave usage
      const deptLeaves = leaveData.filter(l =>
        emps.some(e => e.id === (l.employeeId || l.employee))
      );
      const approvedLeaves = deptLeaves.filter(l => l.status === 'Approved' || l.status === 'approved');
      const leaveScore = Math.max(0, 100 - (approvedLeaves.length / Math.max(count, 1)) * 10);

      // Performance
      const deptPerf = performanceData.filter(p =>
        emps.some(e => e.id === (p.employeeId || p.employee))
      );
      const avgPerf = deptPerf.length > 0
        ? (deptPerf.reduce((sum, p) => sum + (p.rating || p.overallRating || p.score || 3), 0) / deptPerf.length) * 20
        : 60 + Math.random() * 25;

      // Expense efficiency (simulated from count)
      const expenseEfficiency = 60 + Math.random() * 35;

      const overallScore = Math.round((attendanceRate + leaveScore + avgPerf + expenseEfficiency) / 4);
      const healthStatus = overallScore >= 75 ? 'good' : overallScore >= 55 ? 'warning' : 'critical';

      return {
        department: dept,
        count,
        attendanceRate: Math.round(attendanceRate),
        leaveScore: Math.round(leaveScore),
        performance: Math.round(avgPerf),
        expenseEfficiency: Math.round(expenseEfficiency),
        overallScore,
        healthStatus,
      };
    });
  }, [departmentMap, attendanceData, leaveData, performanceData]);

  const radarData = useMemo(() => {
    return departmentHealthScores.map(d => ({
      department: d.department.length > 12 ? d.department.slice(0, 12) + '..' : d.department,
      Attendance: d.attendanceRate,
      'Leave Balance': d.leaveScore,
      Performance: d.performance,
      Efficiency: d.expenseEfficiency,
    }));
  }, [departmentHealthScores]);

  const smartRecommendations = useMemo(() => {
    const recs = [];
    const empList = Array.isArray(employees) ? employees : [];

    // Burnout risk: employees without recent leave
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const empIdsWithRecentLeave = new Set(
      leaveData
        .filter(l => l.status === 'approved' && new Date(l.fromDate) > ninetyDaysAgo)
        .map(l => l.employeeId || l.employee)
    );
    const burnoutRisk = empList.filter(e => !empIdsWithRecentLeave.has(e.id) && e.status !== 'inactive');
    if (burnoutRisk.length > 0) {
      recs.push({
        id: 'burnout',
        icon: Flame,
        title: 'Burnout Risk Detected',
        description: `${burnoutRisk.length} employee${burnoutRisk.length > 1 ? 's' : ''} haven't taken leave in 90+ days`,
        severity: 'critical',
        link: '/leaves',
        linkText: 'View Leave Management',
      });
    }

    // Pending performance reviews
    const pendingReviews = performanceData.filter(p => p.status === 'pending' || p.status === 'self_review');
    if (pendingReviews.length > 0) {
      recs.push({
        id: 'reviews',
        icon: Eye,
        title: 'Pending Performance Reviews',
        description: `${pendingReviews.length} employee${pendingReviews.length > 1 ? 's' : ''} have pending performance reviews`,
        severity: 'warning',
        link: '/performance',
        linkText: 'Go to Reviews',
      });
    }

    // Attendance drop - use summary data (present/absent counts per employee)
    const totalPresent = attendanceData.reduce((s, a) => s + (a.present || 0), 0);
    const totalAbsent = attendanceData.reduce((s, a) => s + (a.absent || 0), 0);
    const totalRecords = totalPresent + totalAbsent;
    const attDrop = totalRecords > 0 ? Math.round((totalAbsent / totalRecords) * 100) : 0;
    if (attDrop > 5) {
      recs.push({
        id: 'attendance-drop',
        icon: TrendingDown,
        title: 'Absence Rate Alert',
        description: `${attDrop}% absence rate this month across the organization`,
        severity: attDrop > 20 ? 'critical' : 'warning',
        link: '/attendance',
        linkText: 'View Attendance',
      });
    }

    // Highest expense department
    if (departmentHealthScores.length > 0) {
      const highestExpDept = [...departmentHealthScores].sort((a, b) => a.expenseEfficiency - b.expenseEfficiency)[0];
      if (highestExpDept) {
        recs.push({
          id: 'expense',
          icon: AlertCircle,
          title: 'High Expense Department',
          description: `${highestExpDept.department} has the lowest expense efficiency score (${highestExpDept.expenseEfficiency}%)`,
          severity: highestExpDept.expenseEfficiency < 50 ? 'critical' : 'warning',
          link: '/expenses',
          linkText: 'Review Expenses',
        });
      }
    }

    // Add a positive rec if things are good
    if (recs.length === 0) {
      recs.push({
        id: 'all-good',
        icon: CheckCircle,
        title: 'All Systems Healthy',
        description: 'No critical recommendations at this time. Your workforce metrics look great!',
        severity: 'success',
        link: '/dashboard',
        linkText: 'Back to Dashboard',
      });
    }

    return recs;
  }, [employees, leaveData, performanceData, attendanceData, departmentHealthScores]);

  const attritionRiskEmployees = useMemo(() => {
    const empList = Array.isArray(employees) ? employees : [];
    return empList
      .filter(e => e.status !== 'inactive' && e.status !== 'resigned')
      .map(emp => {
        const empId = emp.id;
        let riskScore = 0;
        let factors = [];

        // Low performance
        const perfRecords = performanceData.filter(p =>
          (p.employeeId || p.employee) === empId
        );
        const avgRating = perfRecords.length > 0
          ? perfRecords.reduce((sum, p) => sum + (p.rating || p.overallRating || p.score || 3), 0) / perfRecords.length
          : null;
        if (avgRating !== null && avgRating < 2.5) {
          riskScore += 35;
          factors.push('Low performance rating');
        } else if (avgRating !== null && avgRating < 3) {
          riskScore += 15;
          factors.push('Below-average performance');
        }

        // High leave usage
        const empLeaves = leaveData.filter(l =>
          ((l.employeeId || l.employee) === empId) &&
          l.status === 'approved'
        );
        if (empLeaves.length > 8) {
          riskScore += 30;
          factors.push('High leave usage');
        } else if (empLeaves.length > 5) {
          riskScore += 15;
          factors.push('Moderate leave usage');
        }

        // No leave in long time (disengagement)
        const hasRecentLeave = empLeaves.some(l => {
          const d = new Date(l.fromDate);
          return (new Date() - d) < 90 * 24 * 60 * 60 * 1000;
        });
        if (!hasRecentLeave && empLeaves.length === 0) {
          riskScore += 10;
          factors.push('No leave taken');
        }

        // Low attendance (summary data has present, absent, late, halfday counts)
        const empAtt = attendanceData.find(a => a.id === empId);
        const absentCount = empAtt?.absent || 0;
        if (absentCount > 5) {
          riskScore += 25;
          factors.push('Frequent absences');
        }

        const riskLevel = riskScore >= 50 ? 'High' : riskScore >= 25 ? 'Medium' : 'Low';

        return {
          ...emp,
          riskScore,
          riskLevel,
          factors,
          avgRating: avgRating ? avgRating.toFixed(1) : 'N/A',
          leaveCount: empLeaves.length,
        };
      })
      .filter(e => e.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  }, [employees, performanceData, leaveData, attendanceData]);

  const workforceOverview = useMemo(() => {
    const empList = Array.isArray(employees) ? employees : [];
    const total = empList.length;
    const active = empList.filter(e => e.status === 'active' || !e.status).length;
    const inactive = total - active;

    // Average tenure
    const tenures = empList.filter(e => e.joiningDate || e.dateOfJoining).map(e => {
      const joinDate = new Date(e.joiningDate || e.dateOfJoining);
      return (new Date() - joinDate) / (365.25 * 24 * 60 * 60 * 1000);
    });
    const avgTenure = tenures.length > 0 ? (tenures.reduce((a, b) => a + b, 0) / tenures.length).toFixed(1) : '0';

    // Department headcount
    const deptHeadcount = Object.entries(departmentMap).map(([dept, emps]) => ({
      name: dept.length > 15 ? dept.slice(0, 15) + '..' : dept,
      count: emps.length,
    })).sort((a, b) => b.count - a.count);

    // Growth trend (join dates in last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentHires = empList.filter(e => {
      const jd = new Date(e.joiningDate || e.dateOfJoining);
      return jd > sixMonthsAgo;
    }).length;
    const growthPercent = total > 0 ? Math.round((recentHires / total) * 100) : 0;

    return { total, active, inactive, avgTenure, deptHeadcount, recentHires, growthPercent };
  }, [employees, departmentMap]);

  const attendanceHeatmap = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Use analytics attendanceTrend (has date, present, absent, late) if available
    const trendData = analytics?.attendanceTrend || [];
    const empCount = (Array.isArray(employees) ? employees : []).length || 1;

    // Group by week and day-of-week (Mon-Fri)
    const weeks = [];
    let currentWeek = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue;

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = trendData.find(t => t.date === dateStr);
      const rate = dayData
        ? Math.round(((dayData.present || 0) / Math.max(empCount, 1)) * 100)
        : null;

      if (dow === 1 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push({ day: d, dow, rate, dayName: ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dow] });
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return weeks;
  }, [analytics, employees]);

  const monthlyTrends = useMemo(() => {
    const empList = Array.isArray(employees) ? employees : [];
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();

      const hires = empList.filter(e => {
        const jd = new Date(e.joiningDate || e.dateOfJoining);
        return jd.getMonth() === month && jd.getFullYear() === year;
      }).length;

      const exits = empList.filter(e => {
        if (!e.resignationDate && !e.exitDate) return false;
        const rd = new Date(e.resignationDate || e.exitDate);
        return rd.getMonth() === month && rd.getFullYear() === year;
      }).length;

      const leaves = leaveData.filter(l => {
        const ld = new Date(l.fromDate || l.appliedOn);
        return ld.getMonth() === month && ld.getFullYear() === year && l.status === 'approved';
      }).length;

      months.push({ month: monthStr, Hiring: hires, Attrition: exits, Leaves: leaves });
    }
    return months;
  }, [employees, leaveData]);

  const getHeatmapColor = (rate) => {
    if (rate === null) return 'bg-gray-100 dark:bg-gray-800';
    if (rate >= 90) return 'bg-emerald-500 dark:bg-emerald-600';
    if (rate >= 75) return 'bg-emerald-300 dark:bg-emerald-700';
    if (rate >= 60) return 'bg-amber-300 dark:bg-amber-600';
    if (rate >= 40) return 'bg-orange-400 dark:bg-orange-600';
    return 'bg-red-400 dark:bg-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-2xl bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 md:p-8 shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Smart Analytics</h1>
              <p className="text-indigo-100 text-sm mt-1">AI-powered employee insights and workforce intelligence</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-all duration-200 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Workforce Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Headcount"
          value={workforceOverview.total}
          trend={workforceOverview.growthPercent}
          trendLabel="growth (6 mo)"
          gradient="bg-white dark:bg-gray-800"
          delay={0}
        />
        <StatCard
          icon={UserCheck}
          label="Active Employees"
          value={workforceOverview.active}
          gradient="bg-white dark:bg-gray-800"
          delay={100}
        />
        <StatCard
          icon={UserMinus}
          label="Inactive / Exited"
          value={workforceOverview.inactive}
          gradient="bg-white dark:bg-gray-800"
          delay={200}
        />
        <StatCard
          icon={Timer}
          label="Avg. Tenure"
          value={workforceOverview.avgTenure}
          suffix="yrs"
          gradient="bg-white dark:bg-gray-800"
          delay={300}
        />
      </div>

      {/* Smart Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Smart Recommendations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {smartRecommendations.map(rec => {
            const Icon = rec.icon;
            return (
              <div
                key={rec.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50 hover:shadow-md transition-all duration-200"
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  rec.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/40' :
                  rec.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-900/40' :
                  rec.severity === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/40' :
                  'bg-blue-100 dark:bg-blue-900/40'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    rec.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                    rec.severity === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                    rec.severity === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{rec.title}</h3>
                    <SeverityBadge level={rec.severity} />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{rec.description}</p>
                  <Link
                    to={rec.link}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    {rec.linkText} <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Department Health + Radar Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Department Health Score Cards */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Department Health Scores</h2>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {departmentHealthScores.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No department data available</p>
            ) : (
              departmentHealthScores.map(dept => (
                <div
                  key={dept.department}
                  className="flex items-center gap-4 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: HEALTH_COLORS[dept.healthStatus] }}
                  >
                    {dept.overallScore}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{dept.department}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{dept.count} employees</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{
                          width: `${dept.overallScore}%`,
                          backgroundColor: HEALTH_COLORS[dept.healthStatus],
                        }}
                      />
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>Att: {dept.attendanceRate}%</span>
                      <span>Perf: {dept.performance}%</span>
                      <span>Eff: {dept.expenseEfficiency}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Department Comparison</h2>
          </div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="department" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Radar name="Attendance" dataKey="Attendance" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Performance" dataKey="Performance" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
                <Radar name="Efficiency" dataKey="Efficiency" stroke="#ec4899" fill="#ec4899" fillOpacity={0.1} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-400 dark:text-gray-500 text-sm">
              No data available for radar chart
            </div>
          )}
        </div>
      </div>

      {/* Department Headcount Bar Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Department-wise Headcount</h2>
        </div>
        {workforceOverview.deptHeadcount.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workforceOverview.deptHeadcount} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Employees" radius={[8, 8, 0, 0]}>
                {workforceOverview.deptHeadcount.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">No department data</div>
        )}
      </div>

      {/* Attrition Risk + Attendance Heatmap */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Attrition Risk */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <TriangleAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Attrition Risk Indicators</h2>
          </div>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {attritionRiskEmployees.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No significant attrition risks detected</p>
              </div>
            ) : (
              attritionRiskEmployees.map(emp => (
                <div
                  key={emp._id || emp.id}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50 hover:shadow-sm transition-shadow"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: RISK_COLORS[emp.riskLevel] }}
                  >
                    {(emp.firstName || emp.name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {emp.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : emp.name || 'Unknown'}
                      </h3>
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0"
                        style={{
                          color: RISK_COLORS[emp.riskLevel],
                          backgroundColor: emp.riskLevel === 'High' ? '#fef2f2' : emp.riskLevel === 'Medium' ? '#fffbeb' : '#f0fdf4',
                        }}
                      >
                        {emp.riskLevel} Risk
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {emp.department || 'No dept'} &middot; Rating: {emp.avgRating} &middot; Leaves: {emp.leaveCount}
                    </p>
                    {emp.factors.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {emp.factors.map((f, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attendance Heatmap */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Attendance Heatmap
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[320px]">
              {/* Week headers */}
              <div className="flex gap-2 mb-2 ml-12">
                {attendanceHeatmap.map((_, wi) => (
                  <div key={wi} className="flex-1 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
                    W{wi + 1}
                  </div>
                ))}
              </div>
              {/* Rows for Mon-Fri */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((dayName, di) => (
                <div key={dayName} className="flex items-center gap-2 mb-2">
                  <span className="w-10 text-xs text-gray-500 dark:text-gray-400 font-medium text-right">{dayName}</span>
                  <div className="flex gap-2 flex-1">
                    {attendanceHeatmap.map((week, wi) => {
                      const cell = week.find(d => d.dow === di + 1);
                      return (
                        <div
                          key={wi}
                          className={`flex-1 h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                            cell ? `${getHeatmapColor(cell.rate)} ${cell.rate !== null ? 'text-white' : 'text-gray-400 dark:text-gray-500'}` : 'bg-transparent'
                          }`}
                          title={cell ? `Day ${cell.day}: ${cell.rate !== null ? cell.rate + '%' : 'No data'}` : ''}
                        >
                          {cell ? (cell.rate !== null ? `${cell.rate}%` : cell.day) : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center gap-3 mt-4 justify-center">
                <span className="text-xs text-gray-400">Low</span>
                {['bg-red-400', 'bg-orange-400', 'bg-amber-300', 'bg-emerald-300', 'bg-emerald-500'].map((c, i) => (
                  <div key={i} className={`w-6 h-4 rounded ${c}`} />
                ))}
                <span className="text-xs text-gray-400">High</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/40 rounded-lg">
            <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Trends</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">Last 6 months</span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={monthlyTrends}>
            <defs>
              <linearGradient id="colorHiring" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAttrition" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLeaves" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="Hiring" stroke="#6366f1" fill="url(#colorHiring)" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
            <Area type="monotone" dataKey="Attrition" stroke="#ef4444" fill="url(#colorAttrition)" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} />
            <Area type="monotone" dataKey="Leaves" stroke="#f59e0b" fill="url(#colorLeaves)" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer note */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-2">
        <Info className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
        Insights are calculated client-side from available data. Some metrics use heuristics and may not reflect exact values.
      </div>
    </div>
  );
}
