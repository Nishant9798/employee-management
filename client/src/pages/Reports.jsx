import { useState, useEffect } from 'react';
import api from '../api';
import { BarChart3, PieChart, TrendingUp, Award, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/employees/stats/analytics')
      .then(r => { setAnalytics(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10">
          <h1>Reports & Analytics</h1>
          <p>Insights into your organization</p>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <BarChart3 size={100} className="text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="card animate-slide-up">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-indigo-600 dark:text-indigo-400" /> Department Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RPieChart>
                <Pie
                  data={analytics.deptWise}
                  dataKey="count"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ department, count }) => `${department} (${count})`}
                  labelLine={false}
                >
                  {analytics.deptWise.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="card animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Users size={18} className="text-indigo-600 dark:text-indigo-400" /> Gender Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RPieChart>
                <Pie
                  data={analytics.genderWise}
                  dataKey="count"
                  nameKey="gender"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ gender, count }) => `${gender} (${count})`}
                  labelLine={false}
                >
                  {analytics.genderWise?.map((_, i) => (
                    <Cell key={i} fill={['#4f46e5', '#ec4899', '#9ca3af'][i % 3]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" /> Role Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.roleWise} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="role" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Trend */}
        <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" /> Attendance Trend (This Month)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).getDate()} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} labelFormatter={d => new Date(d).toLocaleDateString()} />
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
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" /> Leave Usage by Type
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.leaveUsage} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
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
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" /> Expenses by Category
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.expenseByCategory} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={v => `₹${v.toLocaleString('en-IN')}`} />
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
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Award size={18} className="text-amber-500" /> Top Attendance This Month
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {analytics.topAttendance.map((emp, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800/30' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300' : 'bg-orange-200 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{emp.name}</p>
                  <p className="text-xs text-gray-400">{emp.presentDays} days &middot; {emp.department}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Joining Trend */}
      {analytics.joiningTrend?.length > 0 && (
        <div className="card animate-slide-up" style={{ animationDelay: '500ms' }}>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" /> Employee Joining Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.joiningTrend} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={m => { const [y, mo] = m.split('-'); return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Employees Joined" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
