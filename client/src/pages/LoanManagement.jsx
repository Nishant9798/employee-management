import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Wallet, Plus, Check, X as XIcon, Clock, IndianRupee, TrendingUp, AlertCircle, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

const LOAN_TYPE_LABELS = {
  salary_advance: 'Salary Advance',
  personal_loan: 'Personal Loan',
  emergency_loan: 'Emergency Loan',
};

export default function LoanManagement() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState(isAdmin ? 'pending' : 'my');
  const [myLoans, setMyLoans] = useState([]);
  const [allLoans, setAllLoans] = useState([]);
  const [stats, setStats] = useState({ pending: 0, active: 0, totalDisbursed: 0, outstanding: 0 });
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ type: '', amount: '', emiMonths: '', reason: '' });
  const [actionModal, setActionModal] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [repayModal, setRepayModal] = useState(null);
  const [repayForm, setRepayForm] = useState({ amount: '', month: '', year: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    api.get('/loans/my').then(r => setMyLoans(r.data)).catch(() => {});
    if (isAdmin) {
      api.get('/loans/all').then(r => setAllLoans(r.data)).catch(() => {});
      api.get('/loans/stats/summary').then(r => setStats(r.data)).catch(() => {});
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock size={12} /> Pending</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'active':
        return <span className="badge badge-info">Active</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      case 'completed':
        return <span className="badge badge-gray">Completed</span>;
      default:
        return <span className="badge badge-warning">{status}</span>;
    }
  };

  const handleApply = async () => {
    try {
      await api.post('/loans/apply', {
        type: form.type,
        amount: Number(form.amount),
        emiMonths: Number(form.emiMonths),
        reason: form.reason,
      });
      toast.success('Loan application submitted successfully!');
      setShowApply(false);
      setForm({ type: '', amount: '', emiMonths: '', reason: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to apply for loan');
    }
  };

  const handleAction = async (id, status) => {
    try {
      await api.put(`/loans/${id}/action`, { status, remarks: actionRemarks || undefined });
      toast.success(status === 'approved' ? 'Loan approved successfully' : 'Loan rejected');
      setActionModal(null);
      setActionRemarks('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const handleRepayment = async () => {
    try {
      await api.post(`/loans/${repayModal.id}/repay`, {
        amount: Number(repayForm.amount),
        month: Number(repayForm.month),
        year: Number(repayForm.year),
      });
      toast.success('Repayment recorded successfully');
      setRepayModal(null);
      setRepayForm({ amount: '', month: '', year: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record repayment');
    }
  };

  const getRepaymentProgress = (loan) => {
    const repaid = Number(loan.repaidAmount || 0);
    const total = Number(loan.amount || 0);
    if (total === 0) return 0;
    return Math.min((repaid / total) * 100, 100);
  };

  const pendingLoans = allLoans.filter(l => l.status === 'pending');

  const tabs = isAdmin
    ? [
        { id: 'pending', label: `Pending Approvals${pendingLoans.length ? ` (${pendingLoans.length})` : ''}` },
        { id: 'all', label: 'All Loans' },
      ]
    : [];

  const emiAmount = form.amount && form.emiMonths ? Math.ceil(Number(form.amount) / Number(form.emiMonths)) : 0;

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Loan Management</h1>
            <p>Apply for loans and track repayments</p>
          </div>
          {!isAdmin && (
            <button onClick={() => setShowApply(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-medium hover:bg-white/90 transition shadow-lg">
              <Plus size={16} /> Apply for Loan
            </button>
          )}
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Wallet size={100} className="text-white" />
        </div>
      </div>

      {/* Admin Stats */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card stat-card-amber dark:border-amber-800 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending Requests</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.pending || pendingLoans.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
          <div className="card stat-card-blue dark:border-blue-800 animate-slide-up" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Active Loans</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.active || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <CreditCard size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="card stat-card-emerald dark:border-emerald-800 animate-slide-up" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Disbursed</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatCurrency(stats.totalDisbursed || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
          <div className="card stat-card-red dark:border-red-800 animate-slide-up" style={{ animationDelay: '240ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Outstanding</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{formatCurrency(stats.outstanding || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Tabs */}
      {isAdmin && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Admin - Pending Approvals */}
      {isAdmin && tab === 'pending' && (
        <div className="space-y-4">
          {pendingLoans.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No pending loan requests</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingLoans.map(loan => (
                <div key={loan.id} className="card animate-slide-up">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold dark:text-white">{loan.employeeName}</h3>
                        {getStatusBadge(loan.status)}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Type</p>
                          <p className="font-medium dark:text-slate-200">{LOAN_TYPE_LABELS[loan.type] || loan.type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Amount</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(loan.amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">EMI Months</p>
                          <p className="font-medium dark:text-slate-200">{loan.emiMonths} months</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">EMI Amount</p>
                          <p className="font-medium dark:text-slate-200">{formatCurrency(Math.ceil(Number(loan.amount) / Number(loan.emiMonths)))}/mo</p>
                        </div>
                      </div>
                      {loan.reason && (
                        <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-medium">Reason:</span> {loan.reason}</p>
                      )}
                      <p className="text-xs text-slate-400">Applied: {new Date(loan.createdAt || loan.appliedDate).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex sm:flex-col gap-2 sm:justify-center">
                      <button
                        onClick={() => { setActionModal({ loan, action: 'approved' }); setActionRemarks(''); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition">
                        <Check size={16} /> Approve
                      </button>
                      <button
                        onClick={() => { setActionModal({ loan, action: 'rejected' }); setActionRemarks(''); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition">
                        <XIcon size={16} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin - All Loans */}
      {isAdmin && tab === 'all' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">EMI</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Repaid</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {allLoans.map(loan => {
                const progress = getRepaymentProgress(loan);
                return (
                  <tr key={loan.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium dark:text-white">{loan.employeeName}</p>
                      <p className="text-xs text-slate-400">{loan.department}</p>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{LOAN_TYPE_LABELS[loan.type] || loan.type}</td>
                    <td className="px-4 py-3 text-sm font-semibold dark:text-slate-200">{formatCurrency(loan.amount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                      {formatCurrency(Math.ceil(Number(loan.amount) / Number(loan.emiMonths)))} x {loan.emiMonths}mo
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-1">
                        <p className="text-sm font-medium dark:text-slate-200">{formatCurrency(loan.repaidAmount || 0)}</p>
                        <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(loan.status)}</td>
                    <td className="px-4 py-3">
                      {(loan.status === 'approved' || loan.status === 'active') && (
                        <button
                          onClick={() => {
                            setRepayModal(loan);
                            setRepayForm({ amount: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()) });
                          }}
                          className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                          Record Repayment
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {allLoans.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">No loan records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee - My Loans */}
      {!isAdmin && (
        <div className="space-y-4">
          {myLoans.length === 0 ? (
            <div className="empty-state">
              <Wallet size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 mb-1">No loan applications yet</p>
              <p className="text-xs text-slate-400">Click "Apply for Loan" to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myLoans.map(loan => {
                const progress = getRepaymentProgress(loan);
                const emi = Math.ceil(Number(loan.amount) / Number(loan.emiMonths));
                return (
                  <div key={loan.id} className="card animate-slide-up">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold dark:text-white">{LOAN_TYPE_LABELS[loan.type] || loan.type}</h3>
                          {getStatusBadge(loan.status)}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-slate-400">Loan Amount</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(loan.amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">EMI</p>
                            <p className="font-medium dark:text-slate-200">{formatCurrency(emi)}/mo x {loan.emiMonths}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Repaid</p>
                            <p className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(loan.repaidAmount || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Outstanding</p>
                            <p className="font-medium text-red-600 dark:text-red-400">{formatCurrency(Number(loan.amount) - Number(loan.repaidAmount || 0))}</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {(loan.status === 'approved' || loan.status === 'active' || loan.status === 'completed') && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                              <span>Repayment Progress</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {loan.reason && (
                          <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-medium">Reason:</span> {loan.reason}</p>
                        )}
                        {loan.remarks && (
                          <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-medium">Remarks:</span> {loan.remarks}</p>
                        )}
                        <p className="text-xs text-slate-400">Applied: {new Date(loan.createdAt || loan.appliedDate).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Slide Panel - Apply for Loan */}
      {showApply && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowApply(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-slate-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold dark:text-white">Apply for Loan</h2>
              <button onClick={() => setShowApply(false)}><XIcon size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Loan Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input mt-1">
                  <option value="">Select type</option>
                  <option value="salary_advance">Salary Advance</option>
                  <option value="personal_loan">Personal Loan</option>
                  <option value="emergency_loan">Emergency Loan</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Amount (INR)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"><IndianRupee size={14} /></span>
                  <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input pl-8" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">EMI Months</label>
                <input type="number" value={form.emiMonths} onChange={e => setForm({ ...form, emiMonths: e.target.value })} className="input mt-1" placeholder="e.g. 6" min="1" max="60" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Reason</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} className="input mt-1" placeholder="Describe the reason for your loan request..." />
              </div>
              {form.amount && form.emiMonths && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl space-y-1">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Loan Amount: {formatCurrency(Number(form.amount))}</p>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">EMI: {formatCurrency(emiAmount)}/month for {form.emiMonths} months</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
              <button onClick={() => setShowApply(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleApply} className="btn-primary" disabled={!form.type || !form.amount || !form.emiMonths}>Apply</button>
            </div>
          </div>
        </>
      )}

      {/* Action Modal - Approve/Reject */}
      {actionModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => { setActionModal(null); setActionRemarks(''); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold dark:text-white mb-1">
              {actionModal.action === 'approved' ? 'Approve' : 'Reject'} Loan
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {actionModal.loan.employeeName} - {LOAN_TYPE_LABELS[actionModal.loan.type] || actionModal.loan.type} ({formatCurrency(actionModal.loan.amount)})
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Remarks (optional)</label>
              <textarea value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} rows={3} className="input mt-1" placeholder="Add your remarks..." />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setActionModal(null); setActionRemarks(''); }} className="btn-secondary">Cancel</button>
              <button onClick={() => handleAction(actionModal.loan.id, actionModal.action)}
                className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition ${actionModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {actionModal.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Repayment Modal */}
      {repayModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => { setRepayModal(null); setRepayForm({ amount: '', month: '', year: '' }); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold dark:text-white mb-1">Record Repayment</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              {repayModal.employeeName} - {LOAN_TYPE_LABELS[repayModal.type] || repayModal.type}
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Outstanding: {formatCurrency(Number(repayModal.amount) - Number(repayModal.repaidAmount || 0))}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Repayment Amount (INR)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"><IndianRupee size={14} /></span>
                  <input type="number" value={repayForm.amount} onChange={e => setRepayForm({ ...repayForm, amount: e.target.value })} className="input pl-8" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Month</label>
                  <select value={repayForm.month} onChange={e => setRepayForm({ ...repayForm, month: e.target.value })} className="input mt-1">
                    <option value="">Select</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('en-IN', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Year</label>
                  <input type="number" value={repayForm.year} onChange={e => setRepayForm({ ...repayForm, year: e.target.value })} className="input mt-1" placeholder={String(now.getFullYear())} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setRepayModal(null); setRepayForm({ amount: '', month: '', year: '' }); }} className="btn-secondary">Cancel</button>
              <button onClick={handleRepayment} className="btn-primary" disabled={!repayForm.amount || !repayForm.month || !repayForm.year}>
                Record Payment
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
