import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Users, CalendarCheck, CalendarX, Clock, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({});
  const [myAttendance, setMyAttendance] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/employees/stats/dashboard').then(r => setStats(r.data));
      api.get('/leaves/all-applications').then(r => setRecentLeaves(r.data.slice(0, 5)));
    } else {
      api.get('/leaves/my-applications').then(r => setRecentLeaves(r.data.slice(0, 5)));
    }
    // Today's check-in status
    const today = new Date().toISOString().split('T')[0];
    api.get('/attendance/my', { params: { month: new Date().getMonth() + 1, year: new Date().getFullYear() } })
      .then(r => {
        const todayRec = r.data.find(a => a.date === today);
        setMyAttendance(todayRec);
      });
  }, [isAdmin]);

  const statCards = isAdmin ? [
    { label: 'Total Employees', value: stats.totalEmployees || 0, icon: Users, color: 'bg-blue-500', light: 'bg-blue-50' },
    { label: 'Present Today', value: stats.presentToday || 0, icon: CalendarCheck, color: 'bg-emerald-500', light: 'bg-emerald-50' },
    { label: 'On Leave', value: stats.onLeaveToday || 0, icon: CalendarX, color: 'bg-amber-500', light: 'bg-amber-50' },
    { label: 'Pending Leaves', value: stats.pendingLeaves || 0, icon: Clock, color: 'bg-purple-500', light: 'bg-purple-50' },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Admin Stats */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="card flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.light}`}>
                <s.icon size={24} className={`${s.color.replace('bg-', 'text-')}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CalendarCheck size={20} className="text-indigo-600" /> Today's Attendance
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`badge ${myAttendance?.checkIn ? (myAttendance.status === 'late' ? 'badge-warning' : 'badge-success') : 'badge-gray'}`}>
                {myAttendance?.checkIn ? myAttendance.status?.toUpperCase() : 'NOT CHECKED IN'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Check In</span>
              <span className="text-sm font-medium">{myAttendance?.checkIn || '--:--'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Check Out</span>
              <span className="text-sm font-medium">{myAttendance?.checkOut || '--:--'}</span>
            </div>
            {myAttendance?.workHours && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Work Hours</span>
                <span className="text-sm font-medium">{myAttendance.workHours}h</span>
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
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CalendarX size={20} className="text-indigo-600" /> Recent Leave Applications
          </h2>
          {recentLeaves.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No leave applications</p>
          ) : (
            <div className="space-y-3">
              {recentLeaves.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    {isAdmin && <p className="text-sm font-medium text-gray-800">{l.employeeName}</p>}
                    <p className="text-xs text-gray-500">{l.leaveType} &middot; {l.fromDate} to {l.toDate}</p>
                    <p className="text-xs text-gray-400">{l.reason}</p>
                  </div>
                  <span className={`badge ${l.status === 'approved' ? 'badge-success' : l.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
