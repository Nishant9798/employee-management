import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Clock, Plus, Edit2, Trash2, X, Check, Sun, Moon, Sunset, Timer, UserCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const shiftIcons = {
  Morning: <Sun size={20} className="text-amber-500" />,
  Day: <Sun size={20} className="text-orange-500" />,
  Evening: <Sunset size={20} className="text-purple-500" />,
  Night: <Moon size={20} className="text-indigo-500" />,
};

const getShiftIcon = (name) => {
  if (!name) return <Clock size={20} className="text-gray-500" />;
  const lower = name.toLowerCase();
  if (lower.includes('morning')) return shiftIcons.Morning;
  if (lower.includes('evening')) return shiftIcons.Evening;
  if (lower.includes('night')) return shiftIcons.Night;
  return shiftIcons.Day;
};

export default function Shifts() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState('current');
  const [myShift, setMyShift] = useState(null);
  const [allShifts, setAllShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [allOvertimeRequests, setAllOvertimeRequests] = useState([]);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({ name: '', startTime: '', endTime: '', graceMinutes: 15 });
  const [assignForm, setAssignForm] = useState({ employeeId: '', shiftId: '' });
  const [otForm, setOtForm] = useState({ date: '', hours: '', reason: '' });
  const [showOtForm, setShowOtForm] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    api.get('/shifts').then(r => setAllShifts(r.data)).catch(() => setAllShifts([]));
    api.get('/shifts/my').then(r => setMyShift(r.data)).catch(() => setMyShift(null));
    api.get('/shifts/overtime/my').then(r => setOvertimeRequests(r.data)).catch(() => setOvertimeRequests([]));
    if (isAdmin) {
      api.get('/employees').then(r => setEmployees(r.data)).catch(() => setEmployees([]));
      api.get('/shifts/overtime/all').then(r => setAllOvertimeRequests(r.data)).catch(() => setAllOvertimeRequests([]));
    }
  };

  const handleSaveShift = async () => {
    try {
      if (editingShift) {
        await api.put(`/shifts/${editingShift.id}`, shiftForm);
        toast.success('Shift updated');
      } else {
        await api.post('/shifts', shiftForm);
        toast.success('Shift created');
      }
      setShowShiftForm(false);
      setEditingShift(null);
      setShiftForm({ name: '', startTime: '', endTime: '', graceMinutes: 15 });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDeleteShift = async (id) => {
    if (!confirm('Delete this shift?')) return;
    try {
      await api.delete(`/shifts/${id}`);
      toast.success('Shift deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const openEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime, graceMinutes: shift.graceMinutes || 15 });
    setShowShiftForm(true);
  };

  const handleAssignShift = async () => {
    try {
      await api.post('/shifts/assign', assignForm);
      toast.success('Shift assigned');
      setShowAssign(false);
      setAssignForm({ employeeId: '', shiftId: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleSubmitOvertime = async () => {
    try {
      await api.post('/shifts/overtime', { ...otForm, hours: Number(otForm.hours) });
      toast.success('Overtime request submitted');
      setShowOtForm(false);
      setOtForm({ date: '', hours: '', reason: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleOvertimeAction = async (id, status) => {
    try {
      await api.put(`/shifts/overtime/${id}`, { status });
      toast.success(status === 'approved' ? 'Overtime approved' : 'Overtime rejected');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="badge badge-warning">Pending</span>;
      case 'approved': return <span className="badge badge-success">Approved</span>;
      case 'rejected': return <span className="badge badge-danger">Rejected</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const tabs = [
    { id: 'current', label: 'My Shift' },
    { id: 'all', label: 'All Shifts' },
    { id: 'overtime', label: 'Overtime Requests' },
    ...(isAdmin ? [
      { id: 'manage', label: 'Manage Shifts' },
      { id: 'assign', label: 'Assign Shifts' },
      { id: 'ot-approvals', label: `OT Approvals${allOvertimeRequests.filter(r => r.status === 'pending').length ? ` (${allOvertimeRequests.filter(r => r.status === 'pending').length})` : ''}` },
    ] : []),
  ];

  const shiftColors = ['from-amber-500 to-orange-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-emerald-500 to-teal-500', 'from-indigo-500 to-violet-500', 'from-rose-500 to-red-500'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Shifts & Overtime</h1>
            <p>Manage shift schedules and overtime requests</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowOtForm(true)} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition backdrop-blur-sm">
              <Timer size={16} /> Request Overtime
            </button>
            {isAdmin && (
              <button onClick={() => { setEditingShift(null); setShiftForm({ name: '', startTime: '', endTime: '', graceMinutes: 15 }); setShowShiftForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-white/90 transition shadow-lg">
                <Plus size={16} /> Add Shift
              </button>
            )}
          </div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Clock size={100} className="text-white" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* My Current Shift */}
      {tab === 'current' && (
        <div>
          {myShift ? (
            <div className="card max-w-md animate-slide-up">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                  {getShiftIcon(myShift.name)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{myShift.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your current assigned shift</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{myShift.startTime}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Start Time</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{myShift.endTime}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">End Time</p>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{myShift.graceMinutes || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Grace (min)</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <Clock size={64} />
                <p className="text-lg font-medium mt-2">No shift assigned</p>
                <p className="text-sm">Contact your admin to get a shift assigned</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Shifts */}
      {tab === 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allShifts.map((shift, i) => (
            <div key={shift.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${shiftColors[i % shiftColors.length]} flex items-center justify-center shadow-sm`}>
                  <Clock size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{shift.name}</h3>
                  <p className="text-xs text-gray-400">Grace: {shift.graceMinutes || 0} min</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{shift.startTime}</p>
                  <p className="text-xs text-gray-400">Start</p>
                </div>
                <div className="text-gray-300 dark:text-gray-600 self-center">-</div>
                <div>
                  <p className="text-xl font-bold text-gray-600 dark:text-gray-300">{shift.endTime}</p>
                  <p className="text-xs text-gray-400">End</p>
                </div>
              </div>
            </div>
          ))}
          {allShifts.length === 0 && (
            <div className="col-span-full card">
              <div className="empty-state">
                <Clock size={64} />
                <p className="text-lg font-medium mt-2">No shifts configured</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Overtime Requests */}
      {tab === 'overtime' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Hours</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {overtimeRequests.map(r => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm font-medium dark:text-white">{r.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.hours}h</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">{r.reason}</td>
                  <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                </tr>
              ))}
              {overtimeRequests.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">No overtime requests</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin: Manage Shifts */}
      {tab === 'manage' && isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allShifts.map((shift, i) => (
            <div key={shift.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${shiftColors[i % shiftColors.length]} flex items-center justify-center shadow-sm`}>
                    <Clock size={18} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{shift.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditShift(shift)} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDeleteShift(shift.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{shift.startTime}</p>
                  <p className="text-xs text-gray-400">Start</p>
                </div>
                <div className="text-gray-300 dark:text-gray-600 self-center">-</div>
                <div>
                  <p className="text-xl font-bold text-gray-600 dark:text-gray-300">{shift.endTime}</p>
                  <p className="text-xs text-gray-400">End</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t dark:border-gray-700">
                <p className="text-xs text-gray-400">Grace period: {shift.graceMinutes || 0} minutes</p>
              </div>
            </div>
          ))}
          {allShifts.length === 0 && (
            <div className="col-span-full card">
              <div className="empty-state">
                <Clock size={64} />
                <p className="text-lg font-medium mt-2">No shifts yet</p>
                <p className="text-sm">Create your first shift to get started</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin: Assign Shifts */}
      {tab === 'assign' && isAdmin && (
        <div className="card max-w-lg">
          <h3 className="text-lg font-semibold dark:text-white mb-4">Assign Shift to Employee</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Employee</label>
              <select value={assignForm.employeeId} onChange={e => setAssignForm({...assignForm, employeeId: e.target.value})} className="input mt-1">
                <option value="">Select employee</option>
                {employees.filter(e => e.status === 'active').map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Shift</label>
              <select value={assignForm.shiftId} onChange={e => setAssignForm({...assignForm, shiftId: e.target.value})} className="input mt-1">
                <option value="">Select shift</option>
                {allShifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>)}
              </select>
            </div>
            <button onClick={handleAssignShift} className="btn-primary" disabled={!assignForm.employeeId || !assignForm.shiftId}>
              <UserCheck size={16} className="inline mr-2" /> Assign Shift
            </button>
          </div>
        </div>
      )}

      {/* Admin: OT Approvals */}
      {tab === 'ot-approvals' && isAdmin && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Hours</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {allOvertimeRequests.map(r => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium dark:text-white">{r.employeeName}</p>
                    <p className="text-xs text-gray-400">{r.department}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.hours}h</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleOvertimeAction(r.id, 'approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition" title="Approve"><Check size={16} /></button>
                        <button onClick={() => handleOvertimeAction(r.id, 'rejected')} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Reject"><X size={16} /></button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {allOvertimeRequests.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No overtime requests</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Shift Form Slide Panel */}
      {showShiftForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowShiftForm(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">{editingShift ? 'Edit Shift' : 'Create Shift'}</h2>
              <button onClick={() => setShowShiftForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Shift Name</label>
                <input value={shiftForm.name} onChange={e => setShiftForm({...shiftForm, name: e.target.value})} className="input mt-1" placeholder="e.g. Morning Shift" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Start Time</label>
                  <input type="time" value={shiftForm.startTime} onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})} className="input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">End Time</label>
                  <input type="time" value={shiftForm.endTime} onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})} className="input mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Grace Period (minutes)</label>
                <input type="number" value={shiftForm.graceMinutes} onChange={e => setShiftForm({...shiftForm, graceMinutes: e.target.value})} className="input mt-1" min="0" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowShiftForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveShift} className="btn-primary" disabled={!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime}>
                {editingShift ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Overtime Request Slide Panel */}
      {showOtForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowOtForm(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Request Overtime</h2>
              <button onClick={() => setShowOtForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</label>
                <input type="date" value={otForm.date} onChange={e => setOtForm({...otForm, date: e.target.value})} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Hours</label>
                <input type="number" value={otForm.hours} onChange={e => setOtForm({...otForm, hours: e.target.value})} className="input mt-1" min="0.5" step="0.5" placeholder="e.g. 2" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Reason</label>
                <textarea value={otForm.reason} onChange={e => setOtForm({...otForm, reason: e.target.value})} rows={3} className="input mt-1" placeholder="Why do you need overtime?" />
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle size={12} className="inline mr-1" />
                  Overtime requests require admin approval before being processed.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowOtForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmitOvertime} className="btn-primary" disabled={!otForm.date || !otForm.hours || !otForm.reason}>Submit</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
