import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Plus, Check, X as XIcon, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { StatusBadge, Modal, EmptyState } from '../components/common';

export default function Leaves() {
  const { user, isAdmin, isManager } = useAuth();
  const [tab, setTab] = useState('balance');
  const [balances, setBalances] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', fromDate: '', toDate: '', days: '', reason: '' });
  const [remarkModal, setRemarkModal] = useState(null);
  const [remark, setRemark] = useState('');

  useEffect(() => {
    api.get('/leaves/balance').then(r => setBalances(r.data)).catch(() => {});
    api.get('/leaves/my-applications').then(r => setMyApps(r.data)).catch(() => {});
    api.get('/leaves/types').then(r => setLeaveTypes(r.data)).catch(() => {});
    if (isManager) api.get('/leaves/all-applications').then(r => setAllApps(r.data)).catch(() => {});
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
    if (!form.leaveTypeId || !form.fromDate || !form.toDate) {
      return toast.error('Please fill in all required fields');
    }
    if (new Date(form.fromDate) < new Date(new Date().toISOString().split('T')[0])) {
      return toast.error('Leave start date cannot be in the past');
    }
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      return toast.error('End date must be after start date');
    }
    if (!form.days || form.days <= 0) {
      return toast.error('No working days in selected range');
    }
    try {
      await api.post('/leaves/apply', { ...form, days: Number(form.days) });
      toast.success('Leave applied! Sent to manager for approval.');
      setShowApply(false);
      setForm({ leaveTypeId: '', fromDate: '', toDate: '', days: '', reason: '' });
      api.get('/leaves/my-applications').then(r => setMyApps(r.data));
      api.get('/leaves/balance').then(r => setBalances(r.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  // Manager action (first level)
  const handleManagerAction = async (id, status) => {
    try {
      await api.put(`/leaves/manager-action/${id}`, { status, remarks: remark || undefined });
      toast.success(status === 'approved' ? 'Approved! Sent to HR for final approval.' : 'Leave rejected');
      setRemarkModal(null);
      setRemark('');
      api.get('/leaves/all-applications').then(r => setAllApps(r.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  // HR action (second level)
  const handleHrAction = async (id, status) => {
    try {
      await api.put(`/leaves/hr-action/${id}`, { status, remarks: remark || undefined });
      toast.success(status === 'approved' ? 'Leave approved by HR' : 'Leave rejected by HR');
      setRemarkModal(null);
      setRemark('');
      api.get('/leaves/all-applications').then(r => setAllApps(r.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const openRemarkModal = (app, action, level) => {
    setRemarkModal({ app, action, level });
    setRemark('');
  };

  const submitRemarkAction = () => {
    if (!remarkModal) return;
    const { app, action, level } = remarkModal;
    if (level === 'manager') {
      handleManagerAction(app.id, action);
    } else {
      handleHrAction(app.id, action);
    }
  };

  const getStatusBadge = (status) => <StatusBadge status={status} />;

  // Filter applications by role and approval level
  const managerPendingApps = allApps.filter(a => a.status === 'pending_manager');
  const hrPendingApps = allApps.filter(a => a.status === 'pending_hr');

  const tabs = [
    { id: 'balance', label: 'Leave Balance' },
    { id: 'my', label: 'My Applications' },
    ...(isManager && !isAdmin ? [{ id: 'team', label: `Manager Approvals${managerPendingApps.length ? ` (${managerPendingApps.length})` : ''}` }] : []),
    ...(isAdmin ? [
      { id: 'team', label: `Manager Approvals${managerPendingApps.length ? ` (${managerPendingApps.length})` : ''}` },
      { id: 'hr', label: `HR Approvals${hrPendingApps.length ? ` (${hrPendingApps.length})` : ''}` },
    ] : []),
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
          <button onClick={() => setShowApply(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-medium hover:bg-white/90 transition shadow-lg">
            <Plus size={16} /> Apply Leave
          </button>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <CalendarDays size={100} className="text-white" />
        </div>
      </div>

      {/* Approval Flow Info */}
      <div className="card bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-indigo-700 dark:text-indigo-400">Approval Flow:</span>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded text-xs font-medium">Employee Applies</span>
            <ArrowRight size={14} />
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-medium text-amber-700 dark:text-amber-400">Manager Approval</span>
            <ArrowRight size={14} />
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs font-medium text-blue-700 dark:text-blue-400">HR Approval</span>
            <ArrowRight size={14} />
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-xs font-medium text-emerald-700 dark:text-emerald-400">Approved</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}>
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
                  <h3 className="font-semibold text-slate-800 dark:text-white">{b.leaveType}</h3>
                  <p className="text-xs text-slate-400">{b.description}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${leaveColors[i % leaveColors.length]} flex items-center justify-center shadow-sm`}>
                  <CalendarDays size={18} className="text-white" />
                </div>
              </div>
              <div className="flex gap-6 mb-3">
                <div>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{b.total - b.used}</p>
                  <p className="text-xs text-slate-400">Available</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-300 dark:text-slate-600">{b.used}</p>
                  <p className="text-xs text-slate-400">Used</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-300 dark:text-slate-600">{b.total}</p>
                  <p className="text-xs text-slate-400">Total</p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">From</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">To</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Days</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Approval Details</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {myApps.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-sm font-medium dark:text-white">{a.leaveType}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{a.fromDate}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{a.toDate}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{a.days}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hidden sm:table-cell">{a.reason}</td>
                  <td className="px-4 py-3">{getStatusBadge(a.status)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-xs space-y-1">
                      {a.managerApprovedByName && (
                        <p className="text-slate-500 dark:text-slate-400">
                          <span className="font-medium">Manager:</span> {a.managerApprovedByName}
                          {a.managerRemarks && <span className="text-slate-400"> - {a.managerRemarks}</span>}
                        </p>
                      )}
                      {a.hrApprovedByName && (
                        <p className="text-slate-500 dark:text-slate-400">
                          <span className="font-medium">HR:</span> {a.hrApprovedByName}
                          {a.hrRemarks && <span className="text-slate-400"> - {a.hrRemarks}</span>}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {myApps.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">No applications yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Manager Approval Tab - Team Requests pending manager approval */}
      {tab === 'team' && isManager && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold dark:text-white">Pending Manager Approval</h3>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Dates</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Days</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">Reason</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {managerPendingApps.map(a => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium dark:text-white">{a.employeeName}</p>
                      <p className="text-xs text-slate-400">{a.department}</p>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{a.leaveType}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{a.fromDate} - {a.toDate}</td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{a.days}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate hidden sm:table-cell">{a.reason}</td>
                    <td className="px-4 py-3">{getStatusBadge(a.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openRemarkModal(a, 'approved', 'manager')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition" title="Approve"><Check size={16} /></button>
                        <button onClick={() => openRemarkModal(a, 'rejected', 'manager')} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Reject"><XIcon size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {managerPendingApps.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">No pending requests for manager approval</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Also show all team applications history */}
          <h3 className="text-lg font-semibold dark:text-white mt-6">All Team Applications</h3>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Dates</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Days</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {allApps.filter(a => a.status !== 'pending_manager').map(a => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium dark:text-white">{a.employeeName}</p>
                      <p className="text-xs text-slate-400">{a.department}</p>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{a.leaveType}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{a.fromDate} - {a.toDate}</td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{a.days}</td>
                    <td className="px-4 py-3">{getStatusBadge(a.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HR Approval Tab - Admin only, pending HR approval */}
      {tab === 'hr' && isAdmin && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold dark:text-white">Pending HR Approval</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">These leave requests have been approved by the manager and need your final approval.</p>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Dates</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Days</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">Reason</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Manager Approved By</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {hrPendingApps.map(a => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium dark:text-white">{a.employeeName}</p>
                      <p className="text-xs text-slate-400">{a.department}</p>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{a.leaveType}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{a.fromDate} - {a.toDate}</td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{a.days}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate hidden sm:table-cell">{a.reason}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{a.managerApprovedByName}</p>
                      {a.managerRemarks && <p className="text-xs text-slate-400">{a.managerRemarks}</p>}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(a.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openRemarkModal(a, 'approved', 'hr')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition" title="Approve"><Check size={16} /></button>
                        <button onClick={() => openRemarkModal(a, 'rejected', 'hr')} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Reject"><XIcon size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {hrPendingApps.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400 text-sm">No pending requests for HR approval</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* All applications history for admin */}
          <h3 className="text-lg font-semibold dark:text-white mt-6">All Leave Applications</h3>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Dates</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Days</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Manager</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">HR</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {allApps.filter(a => a.status !== 'pending_hr').map(a => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium dark:text-white">{a.employeeName}</p>
                      <p className="text-xs text-slate-400">{a.department}</p>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{a.leaveType}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{a.fromDate} - {a.toDate}</td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{a.days}</td>
                    <td className="px-4 py-3">{getStatusBadge(a.status)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 dark:text-slate-400">{a.managerApprovedByName || '-'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 dark:text-slate-400">{a.hrApprovedByName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide Panel for Apply Leave */}
      {showApply && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowApply(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-slate-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold dark:text-white">Apply for Leave</h2>
              <button onClick={() => setShowApply(false)}><XIcon size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Leave Type</label>
                <select value={form.leaveTypeId} onChange={e => setForm({...form, leaveTypeId: e.target.value})} className="input mt-1">
                  <option value="">Select type</option>
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">From Date</label>
                  <input type="date" value={form.fromDate} onChange={e => handleFromTo('fromDate', e.target.value)} className="input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">To Date</label>
                  <input type="date" value={form.toDate} onChange={e => handleFromTo('toDate', e.target.value)} className="input mt-1" />
                </div>
              </div>
              {form.days > 0 && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{form.days} working day(s)</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Reason</label>
                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={3} className="input mt-1" placeholder="Why do you need leave?" />
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">Your leave request will first go to your manager for approval, then to HR for final approval.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
              <button onClick={() => setShowApply(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleApply} className="btn-primary" disabled={!form.leaveTypeId || !form.fromDate || !form.toDate}>Apply</button>
            </div>
          </div>
        </>
      )}

      {/* Remark Modal for Approve/Reject */}
      {remarkModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => { setRemarkModal(null); setRemark(''); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold dark:text-white mb-1">
              {remarkModal.action === 'approved' ? 'Approve' : 'Reject'} Leave Request
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {remarkModal.app.employeeName} - {remarkModal.app.leaveType} ({remarkModal.app.days} days)
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Remarks (optional)</label>
              <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={3} className="input mt-1" placeholder="Add your remarks..." />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setRemarkModal(null); setRemark(''); }} className="btn-secondary">Cancel</button>
              <button onClick={submitRemarkAction}
                className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition ${remarkModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {remarkModal.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
