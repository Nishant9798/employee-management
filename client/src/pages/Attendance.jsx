import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Clock, ChevronLeft, ChevronRight, Download, CalendarCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Attendance() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('my');
  const [myRecords, setMyRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [todayAll, setTodayAll] = useState([]);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState('table');

  useEffect(() => { loadData(); }, [month, year, tab]);

  const loadData = () => {
    api.get('/attendance/my', { params: { month, year } }).then(r => setMyRecords(r.data)).catch(() => {});
    if (isAdmin) {
      api.get('/attendance/summary', { params: { month, year } }).then(r => setSummary(r.data)).catch(() => {});
      api.get('/attendance/today').then(r => setTodayAll(r.data)).catch(() => {});
    }
  };

  const monthName = new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const statusColor = (s) => {
    switch (s) {
      case 'present': return 'badge-success';
      case 'late': return 'badge-warning';
      case 'absent': return 'badge-danger';
      case 'halfday': return 'badge-info';
      default: return 'badge-gray';
    }
  };

  const calStatusColor = (s) => {
    switch (s) {
      case 'present': return 'bg-emerald-500';
      case 'late': return 'bg-amber-500';
      case 'absent': return 'bg-red-500';
      case 'halfday': return 'bg-blue-500';
      case 'weekend': return 'bg-slate-300 dark:bg-slate-600';
      case 'holiday': return 'bg-purple-500';
      default: return 'bg-slate-200 dark:bg-slate-700';
    }
  };

  const tabs = [
    { id: 'my', label: 'My Attendance' },
    ...(isAdmin ? [
      { id: 'today', label: "Today's View" },
      { id: 'summary', label: 'Monthly Summary' },
    ] : []),
  ];

  const myStats = {
    present: myRecords.filter(r => r.status === 'present').length,
    late: myRecords.filter(r => r.status === 'late').length,
    absent: myRecords.filter(r => r.status === 'absent').length,
    halfday: myRecords.filter(r => r.status === 'halfday').length,
  };

  // Calendar grid data
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const record = myRecords.find(r => r.date === dateStr);
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    calendarDays.push({
      day: d,
      date: dateStr,
      record,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  const handleExport = async () => {
    try {
      const res = await api.get(`/attendance/export/csv?month=${month}&year=${year}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${year}-${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Attendance</h1>
            <p>Track and manage attendance records</p>
          </div>
          {isAdmin && (
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition backdrop-blur-sm">
              <Download size={16} /> Export CSV
            </button>
          )}
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <CalendarCheck size={100} className="text-white" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'my' && (
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>Table</button>
            <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>Calendar</button>
          </div>
        )}
      </div>

      {/* Month nav */}
      {tab !== 'today' && (
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft size={20} className="dark:text-slate-400" /></button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[150px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={20} className="dark:text-slate-400" /></button>
        </div>
      )}

      {/* My Attendance */}
      {tab === 'my' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Present', value: myStats.present, color: 'stat-card-emerald', textColor: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Late', value: myStats.late, color: 'stat-card-amber', textColor: 'text-amber-600 dark:text-amber-400' },
              { label: 'Absent', value: myStats.absent, color: 'stat-card-blue', textColor: 'text-red-600 dark:text-red-400' },
              { label: 'Half Day', value: myStats.halfday, color: 'stat-card-purple', textColor: 'text-blue-600 dark:text-blue-400' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-4 text-center border border-white/50 dark:border-slate-700`}>
                <p className={`text-2xl font-bold ${s.textColor}`}>{s.value}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          {viewMode === 'calendar' ? (
            <div className="card">
              {/* Calendar legend */}
              <div className="flex flex-wrap gap-3 mb-4">
                {[
                  { label: 'Present', color: 'bg-emerald-500' },
                  { label: 'Late', color: 'bg-amber-500' },
                  { label: 'Absent', color: 'bg-red-500' },
                  { label: 'Half Day', color: 'bg-blue-500' },
                  { label: 'Weekend', color: 'bg-slate-300 dark:bg-slate-600' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${l.color}`} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{l.label}</span>
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">{d}</div>
                ))}
                {calendarDays.map((cd, i) => (
                  <div key={i} className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all ${cd ? 'hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-600 cursor-default' : ''} ${cd?.isWeekend && !cd?.record ? 'bg-slate-50 dark:bg-slate-800' : ''}`}>
                    {cd && (
                      <>
                        <span className={`font-medium ${cd.isWeekend ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{cd.day}</span>
                        {cd.record && (
                          <div className={`w-2.5 h-2.5 rounded-full mt-1 ${calStatusColor(cd.record.status)}`} title={cd.record.status} />
                        )}
                        {cd.isWeekend && !cd.record && (
                          <div className={`w-2.5 h-2.5 rounded-full mt-1 ${calStatusColor('weekend')}`} />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Check In</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Check Out</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Hours</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                </tr></thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {myRecords.map(r => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-sm font-medium dark:text-white">{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{r.checkIn || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{r.checkOut || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{r.workHours ? `${r.workHours}h` : '-'}</td>
                      <td className="px-4 py-3"><span className={`badge ${statusColor(r.status)}`}>{r.status}</span></td>
                    </tr>
                  ))}
                  {myRecords.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No records</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Today's View (Admin) */}
      {tab === 'today' && isAdmin && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Department</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Check In</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Check Out</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
            </tr></thead>
            <tbody className="divide-y dark:divide-slate-700">
              {todayAll.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium dark:text-white">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.empCode}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{r.department}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{r.checkIn || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{r.checkOut || '-'}</td>
                  <td className="px-4 py-3"><span className={`badge ${statusColor(r.status)}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Monthly Summary (Admin) */}
      {tab === 'summary' && isAdmin && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Department</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Present</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Late</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Absent</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Half Day</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Avg Hours</th>
            </tr></thead>
            <tbody className="divide-y dark:divide-slate-700">
              {summary.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-3"><p className="text-sm font-medium dark:text-white">{s.name}</p><p className="text-xs text-slate-400">{s.empCode}</p></td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{s.department}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-emerald-600 dark:text-emerald-400">{s.present || 0}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-amber-600 dark:text-amber-400">{s.late || 0}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-red-600 dark:text-red-400">{s.absent || 0}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-blue-600 dark:text-blue-400">{s.halfday || 0}</td>
                  <td className="px-4 py-3 text-sm text-center text-slate-600 dark:text-slate-400">{s.avgHours || '-'}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
