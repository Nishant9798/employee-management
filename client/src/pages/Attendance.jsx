import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Attendance() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('my');
  const [myRecords, setMyRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [todayAll, setTodayAll] = useState([]);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    loadData();
  }, [month, year, tab]);

  const loadData = () => {
    api.get('/attendance/my', { params: { month, year } }).then(r => setMyRecords(r.data));
    if (isAdmin) {
      api.get('/attendance/summary', { params: { month, year } }).then(r => setSummary(r.data));
      api.get('/attendance/today').then(r => setTodayAll(r.data));
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Month nav */}
      {tab !== 'today' && (
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={20} /></button>
          <span className="text-sm font-semibold text-gray-700 min-w-[150px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={20} /></button>
        </div>
      )}

      {/* My Attendance */}
      {tab === 'my' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-emerald-600">{myStats.present}</p>
              <p className="text-xs text-gray-500">Present</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-amber-600">{myStats.late}</p>
              <p className="text-xs text-gray-500">Late</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-600">{myStats.absent}</p>
              <p className="text-xs text-gray-500">Absent</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-blue-600">{myStats.halfday}</p>
              <p className="text-xs text-gray-500">Half Day</p>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">Check In</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">Check Out</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">Hours</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
              </tr></thead>
              <tbody className="divide-y">
                {myRecords.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium">{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.checkIn || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.checkOut || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.workHours ? `${r.workHours}h` : '-'}</td>
                    <td className="px-4 py-3"><span className={`badge ${statusColor(r.status)}`}>{r.status}</span></td>
                  </tr>
                ))}
                {myRecords.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No records</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Today's View (Admin) */}
      {tab === 'today' && isAdmin && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Department</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Check In</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Check Out</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
            </tr></thead>
            <tbody className="divide-y">
              {todayAll.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.empCode}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.checkIn || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.checkOut || '-'}</td>
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
            <thead><tr className="bg-gray-50 border-b text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Department</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">Present</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">Late</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">Absent</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">Half Day</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">Avg Hours</th>
            </tr></thead>
            <tbody className="divide-y">
              {summary.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3"><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-gray-400">{s.empCode}</p></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.department}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-emerald-600">{s.present || 0}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-amber-600">{s.late || 0}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-red-600">{s.absent || 0}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-blue-600">{s.halfday || 0}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{s.avgHours || '-'}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
