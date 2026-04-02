import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import {
  BarChart3, PieChart, TrendingUp, Award, Users, FileText, Calendar,
  DollarSign, ClipboardList, Download, ChevronUp, ChevronDown, ArrowUpRight,
  ArrowDownRight, Printer, Filter, UserPlus, UserMinus, Briefcase, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const TOOLTIP_STYLE = { borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'headcount', label: 'Headcount', icon: Users },
  { key: 'attendance', label: 'Attendance', icon: Clock },
  { key: 'payroll', label: 'Payroll Summary', icon: DollarSign },
  { key: 'leave', label: 'Leave Report', icon: ClipboardList },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function SummaryCard({ title, value, subtitle, icon: Icon, trend, color = 'indigo', delay = 0 }) {
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };
  return (
    <div className="card animate-slide-up p-4 relative overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(trend)}% vs last month
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.indigo} flex items-center justify-center`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

/* ===================== PRINT STYLES ===================== */
const printStyles = `
@media print {
  body * { visibility: hidden !important; }
  .print-area, .print-area * { visibility: visible !important; }
  .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
  .no-print { display: none !important; }
  .print-header { display: block !important; text-align: center; margin-bottom: 24px; }
  .print-header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .print-header p { font-size: 13px; color: #666; }
  .card { box-shadow: none !important; border: 1px solid #e5e7eb !important; break-inside: avoid; }
  .page-header { background: #4f46e5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export default function Reports() {
  const [analytics, setAnalytics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const printRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, empRes] = await Promise.all([
        api.get('/employees/stats/analytics'),
        api.get('/employees'),
      ]);
      setAnalytics(analyticsRes.data);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.employees || []);
    } catch {
      toast.error('Failed to load analytics');
    }

    // Non-critical fetches - catch individually
    try {
      const attRes = await api.get('/attendance/summary', { params: { month: selectedMonth, year: selectedYear } });
      setAttendanceSummary(Array.isArray(attRes.data) ? attRes.data : attRes.data?.summary || []);
    } catch { setAttendanceSummary([]); }

    try {
      const payRes = await api.get('/salary/all-payslips');
      setPayslips(Array.isArray(payRes.data) ? payRes.data : payRes.data?.payslips || []);
    } catch { setPayslips([]); }

    try {
      const leaveRes = await api.get('/leaves/all-applications');
      setLeaveApplications(Array.isArray(leaveRes.data) ? leaveRes.data : leaveRes.data?.applications || leaveRes.data?.leaves || []);
    } catch { setLeaveApplications([]); }

    setLoading(false);
  }, [selectedMonth, selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = () => {
    window.print();
  };

  // ============ DERIVED DATA ============

  // Headcount
  const totalEmployees = employees.length;
  const now = new Date(selectedYear, selectedMonth - 1);
  const newHires = employees.filter(e => {
    const d = new Date(e.joiningDate || e.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const deptHeadcount = {};
  employees.forEach(e => {
    const dept = e.department || 'Unassigned';
    deptHeadcount[dept] = (deptHeadcount[dept] || 0) + 1;
  });
  const deptHeadcountData = Object.entries(deptHeadcount).map(([dept, count]) => ({ department: dept, count }));

  const genderData = {};
  employees.forEach(e => {
    const g = e.gender || 'Not Specified';
    genderData[g] = (genderData[g] || 0) + 1;
  });
  const genderChartData = Object.entries(genderData).map(([gender, count]) => ({ gender, count }));

  const roleData = {};
  employees.forEach(e => {
    const r = e.role || e.designation || 'Unassigned';
    roleData[r] = (roleData[r] || 0) + 1;
  });
  const roleChartData = Object.entries(roleData).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  // Joining trend from employees
  const joiningByMonth = {};
  employees.forEach(e => {
    const d = new Date(e.joiningDate || e.createdAt);
    if (!isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      joiningByMonth[key] = (joiningByMonth[key] || 0) + 1;
    }
  });
  const joiningTrendData = Object.entries(joiningByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({ month, count }));

  // Attendance derived
  const totalPresent = attendanceSummary.reduce((s, a) => s + (a.present || a.presentDays || 0), 0);
  const totalWorkingDays = attendanceSummary.reduce((s, a) => s + (a.totalWorkingDays || a.total || 22), 0);
  const overallAttendanceRate = totalWorkingDays > 0 ? Math.round((totalPresent / totalWorkingDays) * 100) : 0;

  const deptAttendance = {};
  attendanceSummary.forEach(a => {
    const dept = a.department || 'Unassigned';
    if (!deptAttendance[dept]) deptAttendance[dept] = { present: 0, total: 0 };
    deptAttendance[dept].present += (a.present || a.presentDays || 0);
    deptAttendance[dept].total += (a.totalWorkingDays || a.total || 22);
  });
  const deptAttendanceData = Object.entries(deptAttendance).map(([dept, v]) => ({
    department: dept,
    rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
  }));

  // Payroll derived
  const totalPayroll = payslips.reduce((s, p) => s + (p.netSalary || p.totalSalary || p.amount || 0), 0);
  const deptSalary = {};
  payslips.forEach(p => {
    const dept = p.department || p.employee?.department || 'Unassigned';
    deptSalary[dept] = (deptSalary[dept] || 0) + (p.netSalary || p.totalSalary || p.amount || 0);
  });
  const deptSalaryPieData = Object.entries(deptSalary).map(([dept, total]) => ({ department: dept, total }));
  const deptSalaryCount = {};
  payslips.forEach(p => {
    const dept = p.department || p.employee?.department || 'Unassigned';
    if (!deptSalaryCount[dept]) deptSalaryCount[dept] = { sum: 0, count: 0 };
    deptSalaryCount[dept].sum += (p.netSalary || p.totalSalary || p.amount || 0);
    deptSalaryCount[dept].count += 1;
  });
  const avgSalaryByDept = Object.entries(deptSalaryCount).map(([dept, v]) => ({
    department: dept, average: Math.round(v.sum / v.count),
  }));

  const totalBasic = payslips.reduce((s, p) => s + (p.basicSalary || p.basic || 0), 0);
  const totalHRA = payslips.reduce((s, p) => s + (p.hra || 0), 0);
  const totalAllowances = payslips.reduce((s, p) => s + (p.allowances || p.otherAllowances || 0), 0);
  const totalDeductions = payslips.reduce((s, p) => s + (p.deductions || p.totalDeductions || 0), 0);
  const salaryBreakdown = [
    { name: 'Basic', value: totalBasic },
    { name: 'HRA', value: totalHRA },
    { name: 'Allowances', value: totalAllowances },
    { name: 'Deductions', value: totalDeductions },
  ].filter(s => s.value > 0);

  // Leave derived
  const leaveByType = {};
  leaveApplications.forEach(l => {
    const t = l.leaveType || l.type || 'Other';
    if (!leaveByType[t]) leaveByType[t] = 0;
    leaveByType[t] += (l.days || l.numberOfDays || 1);
  });
  const leaveByTypeData = Object.entries(leaveByType).map(([type, days]) => ({ type, days }));

  const leaveByEmployee = {};
  leaveApplications.forEach(l => {
    const name = l.employeeName || l.employee?.name || 'Unknown';
    if (!leaveByEmployee[name]) leaveByEmployee[name] = 0;
    leaveByEmployee[name] += (l.days || l.numberOfDays || 1);
  });
  const topLeaveTakers = Object.entries(leaveByEmployee)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, days]) => ({ name, days }));

  const leaveByMonth = {};
  leaveApplications.forEach(l => {
    const d = new Date(l.startDate || l.fromDate || l.createdAt);
    if (!isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      leaveByMonth[key] = (leaveByMonth[key] || 0) + (l.days || l.numberOfDays || 1);
    }
  });
  const monthlyLeaveTrend = Object.entries(leaveByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, days]) => ({ month, days }));

  const totalLeaveDays = leaveApplications.reduce((s, l) => s + (l.days || l.numberOfDays || 1), 0);
  const approvedLeaves = leaveApplications.filter(l => (l.status || '').toLowerCase() === 'approved').length;
  const pendingLeaves = leaveApplications.filter(l => (l.status || '').toLowerCase() === 'pending').length;

  // ============ RENDER ============

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!analytics) return (
    <div className="card">
      <div className="empty-state">
        <BarChart3 size={64} />
        <p className="text-lg font-medium mt-2">Unable to load analytics</p>
        <p className="text-sm">Please try again later</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{printStyles}</style>
      <div className="space-y-6" ref={printRef}>
        {/* Print Header - hidden on screen */}
        <div className="print-header hidden">
          <h1>Employee Management - Reports</h1>
          <p>{TABS.find(t => t.key === activeTab)?.label} | {MONTHS[selectedMonth - 1]} {selectedYear} | Generated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Page Header */}
        <div className="page-header no-print">
          <div className="relative z-10">
            <h1>Reports & Analytics</h1>
            <p>Insights into your organization</p>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
            <BarChart3 size={100} className="text-white" />
          </div>
        </div>

        {/* Tab Bar + Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
          <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
              <Filter size={14} className="text-slate-400" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-sm text-slate-700 dark:text-slate-300 border-none outline-none cursor-pointer"
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-sm text-slate-700 dark:text-slate-300 border-none outline-none cursor-pointer"
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Printer size={16} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Print area wrapper */}
        <div className="print-area">
          {/* Print-only header inside print area */}
          <div className="print-header hidden">
            <h1>Employee Management System</h1>
            <p>{TABS.find(t => t.key === activeTab)?.label} Report | {MONTHS[selectedMonth - 1]} {selectedYear} | Generated: {new Date().toLocaleDateString()}</p>
            <hr style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />
          </div>

          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard title="Total Employees" value={totalEmployees} icon={Users} color="indigo" />
                <SummaryCard title="New Hires" value={newHires} subtitle={`${MONTHS[selectedMonth - 1]} ${selectedYear}`} icon={UserPlus} color="green" delay={50} />
                <SummaryCard title="Attendance Rate" value={`${overallAttendanceRate}%`} icon={Clock} color="amber" delay={100} />
                <SummaryCard title="Total Payroll" value={`₹${totalPayroll.toLocaleString('en-IN')}`} icon={DollarSign} color="purple" delay={150} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Distribution */}
                <div className="card animate-slide-up">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <PieChart size={18} className="text-indigo-600 dark:text-indigo-400" /> Department Distribution
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RPieChart>
                        <Pie data={analytics.deptWise} dataKey="count" nameKey="department" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} label={({ department, count }) => `${department} (${count})`} labelLine={false}>
                          {analytics.deptWise.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                      </RPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gender Distribution */}
                <div className="card animate-slide-up" style={{ animationDelay: '50ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Users size={18} className="text-indigo-600 dark:text-indigo-400" /> Gender Distribution
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RPieChart>
                        <Pie data={analytics.genderWise} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} label={({ gender, count }) => `${gender} (${count})`} labelLine={false}>
                          {analytics.genderWise?.map((_, i) => <Cell key={i} fill={['#4f46e5', '#ec4899', '#9ca3af'][i % 3]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                      </RPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Role Distribution */}
                <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" /> Role Distribution
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.roleWise} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="role" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Attendance Trend */}
                <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" /> Attendance Trend (This Month)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.attendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).getDate()} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={d => new Date(d).toLocaleDateString()} />
                        <Legend />
                        <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Leave Usage */}
                <div className="card animate-slide-up" style={{ animationDelay: '300ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" /> Leave Usage by Type
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.leaveUsage} layout="vertical" barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend />
                        <Bar dataKey="used" fill="#ef4444" radius={[0, 4, 4, 0]} name="Used" />
                        <Bar dataKey="total" fill="#e5e7eb" radius={[0, 4, 4, 0]} name="Total" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Expense by Category */}
                {analytics.expenseByCategory?.length > 0 && (
                  <div className="card animate-slide-up" style={{ animationDelay: '350ms' }}>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" /> Expenses by Category
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.expenseByCategory} barSize={30}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                          <Bar dataKey="total" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Total (₹)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Attendance */}
              {analytics.topAttendance?.length > 0 && (
                <div className="card animate-slide-up" style={{ animationDelay: '400ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Award size={18} className="text-amber-500" /> Top Attendance This Month
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {analytics.topAttendance.map((emp, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800/30' : 'bg-slate-50 dark:bg-slate-700/50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300' : 'bg-orange-200 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-white">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.presentDays} days &middot; {emp.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Joining Trend */}
              {analytics.joiningTrend?.length > 0 && (
                <div className="card animate-slide-up" style={{ animationDelay: '500ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" /> Employee Joining Trend
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.joiningTrend} barSize={30}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={m => { const [y, mo] = m.split('-'); return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); }} />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Employees Joined" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= HEADCOUNT TAB ================= */}
          {activeTab === 'headcount' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <SummaryCard title="Total Employees" value={totalEmployees} icon={Users} color="indigo" />
                <SummaryCard title="New Hires" value={newHires} subtitle={`${MONTHS[selectedMonth - 1]} ${selectedYear}`} icon={UserPlus} color="green" delay={50} />
                <SummaryCard title="Departments" value={Object.keys(deptHeadcount).length} icon={Briefcase} color="purple" delay={100} />
              </div>

              {/* Department-wise headcount table */}
              <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Briefcase size={18} className="text-indigo-600 dark:text-indigo-400" /> Department-wise Headcount
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Department</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Headcount</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deptHeadcountData.sort((a, b) => b.count - a.count).map((d, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">{d.department}</td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{d.count}</td>
                          <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">{totalEmployees > 0 ? ((d.count / totalEmployees) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-700/30 font-semibold">
                        <td className="py-3 px-4 text-slate-800 dark:text-slate-200">Total</td>
                        <td className="py-3 px-4 text-right text-slate-800 dark:text-slate-200">{totalEmployees}</td>
                        <td className="py-3 px-4 text-right text-slate-800 dark:text-slate-200">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gender Ratio Pie Chart */}
                <div className="card animate-slide-up" style={{ animationDelay: '150ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <PieChart size={18} className="text-indigo-600 dark:text-indigo-400" /> Gender Ratio
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RPieChart>
                        <Pie data={genderChartData} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} label={({ gender, count }) => `${gender} (${count})`} labelLine={false}>
                          {genderChartData.map((_, i) => <Cell key={i} fill={['#4f46e5', '#ec4899', '#9ca3af', '#06b6d4'][i % 4]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                      </RPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Role Distribution Bar Chart */}
                <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" /> Role Distribution
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roleChartData} barSize={35}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="role" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} name="Employees" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Joining Trend Line Chart */}
              <div className="card animate-slide-up" style={{ animationDelay: '250ms' }}>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" /> Joining Trend (Last 12 Months)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={joiningTrendData}>
                      <defs>
                        <linearGradient id="joinGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={m => { const [y, mo] = m.split('-'); return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'short' }); }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={m => { const [y, mo] = m.split('-'); return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); }} />
                      <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#joinGradient)" name="Joinings" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ================= ATTENDANCE TAB ================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard title="Overall Attendance" value={`${overallAttendanceRate}%`} icon={Clock} color="green" />
                <SummaryCard title="Employees Tracked" value={attendanceSummary.length} icon={Users} color="indigo" delay={50} />
                <SummaryCard title="Total Present Days" value={totalPresent} icon={Award} color="amber" delay={100} />
                <SummaryCard title="Period" value={`${MONTHS[selectedMonth - 1].slice(0, 3)} ${selectedYear}`} icon={Calendar} color="purple" delay={150} />
              </div>

              {/* Attendance Rate Progress */}
              <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">Overall Attendance Rate</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                        style={{ width: `${overallAttendanceRate}%` }}
                      >
                        <span className="text-xs font-bold text-white">{overallAttendanceRate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 min-w-[80px] text-right">
                    {overallAttendanceRate}%
                  </div>
                </div>
              </div>

              {/* Monthly Attendance Summary Table */}
              {attendanceSummary.length > 0 && (
                <div className="card animate-slide-up" style={{ animationDelay: '150ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <ClipboardList size={18} className="text-indigo-600 dark:text-indigo-400" /> Monthly Attendance Summary
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Employee</th>
                          <th className="text-center py-3 px-4 font-semibold text-emerald-600">Present</th>
                          <th className="text-center py-3 px-4 font-semibold text-red-500">Absent</th>
                          <th className="text-center py-3 px-4 font-semibold text-amber-500">Late</th>
                          <th className="text-center py-3 px-4 font-semibold text-blue-500">Half Day</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Working Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceSummary.slice(0, 20).map((a, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">{a.employeeName || a.name || a.employee?.name || `Employee ${i + 1}`}</td>
                            <td className="py-3 px-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">{a.present || a.presentDays || 0}</span></td>
                            <td className="py-3 px-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 font-semibold text-xs">{a.absent || a.absentDays || 0}</span></td>
                            <td className="py-3 px-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-semibold text-xs">{a.late || a.lateDays || 0}</span></td>
                            <td className="py-3 px-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 font-semibold text-xs">{a.halfDay || a.halfDays || 0}</span></td>
                            <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300 font-medium">{a.totalWorkingDays || a.total || 22}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {attendanceSummary.length > 20 && (
                    <p className="text-xs text-slate-400 mt-3 text-center">Showing 20 of {attendanceSummary.length} employees</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department-wise Attendance */}
                {deptAttendanceData.length > 0 && (
                  <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" /> Department-wise Attendance
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptAttendanceData} barSize={35}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `${v}%`} />
                          <Bar dataKey="rate" fill="#10b981" radius={[8, 8, 0, 0]} name="Attendance Rate" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Daily Attendance Trend */}
                {analytics.attendanceTrend?.length > 0 && (
                  <div className="card animate-slide-up" style={{ animationDelay: '250ms' }}>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" /> Daily Attendance Trend
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.attendanceTrend}>
                          <defs>
                            <linearGradient id="attGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).getDate()} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={d => new Date(d).toLocaleDateString()} />
                          <Legend />
                          <Area type="monotone" dataKey="present" stroke="#10b981" fill="url(#attGradient)" strokeWidth={2} name="Present" />
                          <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={false} name="Late" />
                          <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} name="Absent" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {attendanceSummary.length === 0 && (
                <div className="card">
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <Clock size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No attendance data available for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
                    <p className="text-sm mt-1">Try selecting a different month or year</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= PAYROLL TAB ================= */}
          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard title="Total Payroll Cost" value={`₹${totalPayroll.toLocaleString('en-IN')}`} icon={DollarSign} color="indigo" />
                <SummaryCard title="Total Payslips" value={payslips.length} icon={FileText} color="green" delay={50} />
                <SummaryCard title="Avg Salary" value={`₹${payslips.length > 0 ? Math.round(totalPayroll / payslips.length).toLocaleString('en-IN') : 0}`} icon={TrendingUp} color="amber" delay={100} />
                <SummaryCard title="Departments" value={Object.keys(deptSalary).length} icon={Briefcase} color="purple" delay={150} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department-wise Salary Pie */}
                {deptSalaryPieData.length > 0 && (
                  <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <PieChart size={18} className="text-indigo-600 dark:text-indigo-400" /> Department Salary Distribution
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                          <Pie data={deptSalaryPieData} dataKey="total" nameKey="department" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={2} label={({ department, total }) => `${department} (₹${(total / 1000).toFixed(0)}k)`} labelLine={false}>
                            {deptSalaryPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                        </RPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Average Salary by Department */}
                {avgSalaryByDept.length > 0 && (
                  <div className="card animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" /> Average Salary by Department
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={avgSalaryByDept} barSize={35}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                          <Bar dataKey="average" fill="#4f46e5" radius={[8, 8, 0, 0]} name="Avg Salary (₹)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* Salary Component Breakdown */}
              {salaryBreakdown.length > 0 && (
                <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign size={18} className="text-indigo-600 dark:text-indigo-400" /> Salary Component Breakdown
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {salaryBreakdown.map((item, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                        </div>
                        <p className="text-xl font-bold text-slate-800 dark:text-white">₹{item.value.toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RPieChart>
                        <Pie data={salaryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} label={({ name, value }) => `${name} (₹${(value / 1000).toFixed(0)}k)`} labelLine={false}>
                          {salaryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                      </RPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {payslips.length === 0 && (
                <div className="card">
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <DollarSign size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No payroll data available</p>
                    <p className="text-sm mt-1">Payslip data will appear here once generated</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= LEAVE TAB ================= */}
          {activeTab === 'leave' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard title="Total Applications" value={leaveApplications.length} icon={ClipboardList} color="indigo" />
                <SummaryCard title="Total Leave Days" value={totalLeaveDays} icon={Calendar} color="amber" delay={50} />
                <SummaryCard title="Approved" value={approvedLeaves} icon={Award} color="green" delay={100} />
                <SummaryCard title="Pending" value={pendingLeaves} icon={Clock} color="red" delay={150} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leave Usage by Type */}
                {leaveByTypeData.length > 0 && (
                  <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" /> Leave Usage by Type
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leaveByTypeData} barSize={35}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="days" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Days" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Top Leave Takers */}
                {topLeaveTakers.length > 0 && (
                  <div className="card animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <Users size={18} className="text-indigo-600 dark:text-indigo-400" /> Top Leave Takers
                    </h3>
                    <div className="space-y-2">
                      {topLeaveTakers.map((emp, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : i < 3 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-white">{emp.name}</p>
                          </div>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{emp.days} days</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Leave Trend */}
              {monthlyLeaveTrend.length > 0 && (
                <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" /> Monthly Leave Trend
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyLeaveTrend}>
                        <defs>
                          <linearGradient id="leaveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={m => { const [y, mo] = m.split('-'); return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'short' }); }} />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={m => { const [y, mo] = m.split('-'); return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); }} />
                        <Area type="monotone" dataKey="days" stroke="#f59e0b" fill="url(#leaveGradient)" strokeWidth={2} name="Leave Days" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Leave Balance Summary Table */}
              {leaveApplications.length > 0 && (
                <div className="card animate-slide-up" style={{ animationDelay: '250ms' }}>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <ClipboardList size={18} className="text-indigo-600 dark:text-indigo-400" /> Leave Applications Summary
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Employee</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Days</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveApplications.slice(0, 15).map((l, i) => {
                          const status = (l.status || 'pending').toLowerCase();
                          const statusColor = status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
                          return (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">{l.employeeName || l.employee?.name || 'Unknown'}</td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{l.leaveType || l.type || 'N/A'}</td>
                              <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300 font-medium">{l.days || l.numberOfDays || 1}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {leaveApplications.length > 15 && (
                    <p className="text-xs text-slate-400 mt-3 text-center">Showing 15 of {leaveApplications.length} applications</p>
                  )}
                </div>
              )}

              {leaveApplications.length === 0 && (
                <div className="card">
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <ClipboardList size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No leave data available</p>
                    <p className="text-sm mt-1">Leave applications will appear here once submitted</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
