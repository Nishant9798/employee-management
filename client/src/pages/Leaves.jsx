import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Plus, Check, X as XIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Leaves() {
  const { user, isAdmin, isManager } = useAuth();
  const [tab, setTab] = useState('balance');
  const [balances, setBalances] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', fromDate: '', toDate: '', days: '', reason: '' });

  useEffect(() => {
    api.get('/leaves/balance').then(r => setBalances(r.data));
    api.get('/leaves/my-applications').then(r => setMyApps(r.data));
    api.get('/leaves/types').then(r => setLeaveTypes(r.data));
    if (isManager) api.get('/leaves/all-applications').then(r => setAllApps(r.data));
  }, [isManager]);

  const calcDays = (from, to) => {
    if (!from || !to) return 0;
    const d1 = new Date(from), d2 = new Date(to);
    let count = 0;
    for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  };

  const handleFromTo = (key, val) => {
    const newForm = { ...form, [key]: val };
    newForm.days = calcDays(newForm.fromDate, newForm.toDate);
    setForm(newForm);
  };

  const handleApply = async () => {
    try {
      await api.post('/leaves/apply', { ...form, days: Number(form.days) });
      toast.success('Leave applied!');
      setShowApply(false);
      setForm({ leaveTypeId: '', fromDate: '', toDate: '', days: '', reason: '' });
      api.get('/leaves/my-applications').then(r => setMyApps(r.data));
      api.get('/leaves/balance').then(r => setBalances(r.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleAction = async (id, status) => {
    try {
      await api.put(`/leaves/action/${id}`, { status });
      toast.success(`Leave ${status}`);
      api.get('/leaves/all-applications').then(r => setAllApps(r.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const tabs = [
    { id: 'balance', label: 'Leave Balance' },
    { id: 'my', label: 'My Applications' },
    ...(isManager ? [{ id: 'team', label: 'Team Requests' }] : []),
  ];

  const leaveColors = ['from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-purple-500 to-pink-500', 'from-amber-500 to-orange-500', 'from-indigo-500 to-violet-500', 'from-rose-500 to-red-500'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Leave Management</h1>
            <p>Apply and manage your leaves</p>
          </div>
          <button onClick={() => setShowApply(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-white/90 transition shadow-lg">
            <Plus size={16} /> Apply Leave
          </button>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <CalendarDays size={100} className="text-white" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Balance */}
      {tab === 'balance' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {balances.map((b, i) => (
            <div key={b.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{b.leaveType}</h3>
                  <p className="text-xs text-gray-400">{b.description}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${leaveColors[i % leaveColors.length]} flex items-center justify-center shadow-sm`}>
                  <CalendarDays size={18} className="text-white" />
                </div>
              </div>
              <div className="flex gap-6 mb-3">
                <div>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{b.total - b.used}</p>
                  <p className="text-xs text-gray-400">Available</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-300 dark:text-gray-600">{b.used}</p>
                  <p className="text-xs text-gray-400">Used</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-300 dark:text-gray-600">{b.total}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${leaveColors[i % leaveColors.length]} rounded-full transition-all duration-500`} style={{ width: `${(b.used / b.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Applications */}
      {tab === 'my' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">From</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">To</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Days</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {myApps.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-sm font-medium dark:text-white">{a.leaveType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{a.fromDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{a.toDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{a.days}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">{a.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${a.status === 'approved' ? 'badge-success' : a.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
              {myApps.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No applications yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Team Requests */}
      {tab === 'team' && isManager && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Dates</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Days</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {allApps.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium dark:text-white">{a.employeeName}</p>
                    <p className="text-xs text-gray-400">{a.department}</p>
                  </td>
                  <td className="px-4 py-3 text-sm dark:text-gray-300">{a.leaveType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{a.fromDate} - {a.toDate}</td>
                  <td className="px-4 py-3 text-sm dark:text-gray-300">{a.days}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate hidden sm:table-cell">{a.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${a.status === 'approved' ? 'badge-success' : a.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleAction(a.id, 'approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition" title="Approve"><Check size={16} /></button>
                        <button onClick={() => handleAction(a.id, 'rejected')} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Reject"><XIcon size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide Panel for Apply Leave */}
      {showApply && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowApply(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Apply for Leave</h2>
              <button onClick={() => setShowApply(false)}><XIcon size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Leave Type</label>
                <select value={form.leaveTypeId} onChange={e => setForm({...form, leaveTypeId: e.target.value})} className="input mt-1">
                  <option value="">Select type</option>
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">From Date</label>
                  <input type="date" value={form.fromDate} onChange={e => handleFromTo('fromDate', e.target.value)} className="input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">To Date</label>
                  <input type="date" value={form.toDate} onChange={e => handleFromTo('toDate', e.target.value)} className="input mt-1" />
                </div>
              </div>
              {form.days > 0 && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{form.days} working day(s)</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Reason</label>
                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={3} className="input mt-1" placeholder="Why do you need leave?" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowApply(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleApply} className="btn-primary" disabled={!form.leaveTypeId || !form.fromDate || !form.toDate}>Apply</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
