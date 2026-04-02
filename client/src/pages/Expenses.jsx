import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Receipt, Plus, Check, X as XIcon, Clock, ArrowRight, IndianRupee, TrendingUp, AlertCircle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

// Categories loaded from API

export default function Expenses() {
  const { user, isAdmin, isManager } = useAuth();
  const [tab, setTab] = useState('my');
  const [myExpenses, setMyExpenses] = useState([]);
  const [teamExpenses, setTeamExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState({ category: '', amount: '', description: '', date: '' });
  const [remarkModal, setRemarkModal] = useState(null);
  const [remark, setRemark] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    api.get('/expenses/categories').then(r => setCategories(r.data)).catch(() => {});
    api.get('/expenses/my').then(r => setMyExpenses(r.data)).catch(() => {});
    if (isManager) api.get('/expenses/all').then(r => setTeamExpenses(r.data)).catch(() => {});
    if (isAdmin) api.get('/expenses/all').then(r => setAllExpenses(r.data)).catch(() => {});
  };

  const handleSubmit = async () => {
    try {
      await api.post('/expenses/submit', { categoryId: form.category, amount: Number(form.amount), description: form.description, expenseDate: form.date });
      toast.success('Expense submitted! Sent to manager for approval.');
      setShowSubmit(false);
      setForm({ category: '', amount: '', description: '', date: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit expense');
    }
  };

  const handleManagerAction = async (id, status) => {
    try {
      await api.put(`/expenses/manager-action/${id}`, { status, remarks: remark || undefined });
      toast.success(status === 'approved' ? 'Approved! Sent to finance for final approval.' : 'Expense rejected');
      setRemarkModal(null);
      setRemark('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleFinanceAction = async (id, status) => {
    try {
      await api.put(`/expenses/finance-action/${id}`, { status, remarks: remark || undefined });
      toast.success(status === 'approved' ? 'Expense approved by finance' : 'Expense rejected by finance');
      setRemarkModal(null);
      setRemark('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const openRemarkModal = (expense, action, level) => {
    setRemarkModal({ expense, action, level });
    setRemark('');
  };

  const submitRemarkAction = () => {
    if (!remarkModal) return;
    const { expense, action, level } = remarkModal;
    if (level === 'manager') {
      handleManagerAction(expense.id, action);
    } else {
      handleFinanceAction(expense.id, action);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_manager':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock size={12} /> Pending Manager</span>;
      case 'pending_finance':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Clock size={12} /> Pending Finance</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge badge-warning">{status}</span>;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const managerPending = teamExpenses.filter(e => e.status === 'pending_manager');
  const financePending = allExpenses.filter(e => e.status === 'pending_finance');

  // Summary stats for admin
  const totalApproved = allExpenses.filter(e => e.status === 'approved').reduce((s, e) => s + Number(e.amount), 0);
  const totalPending = allExpenses.filter(e => e.status === 'pending_manager' || e.status === 'pending_finance').reduce((s, e) => s + Number(e.amount), 0);
  const now = new Date();
  const thisMonthTotal = allExpenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.status === 'approved';
  }).reduce((s, e) => s + Number(e.amount), 0);

  const tabs = [
    { id: 'my', label: 'My Expenses' },
    ...(isManager && !isAdmin ? [{ id: 'team', label: `Team Requests${managerPending.length ? ` (${managerPending.length})` : ''}` }] : []),
    ...(isAdmin ? [
      { id: 'team', label: `Team Requests${managerPending.length ? ` (${managerPending.length})` : ''}` },
      { id: 'finance', label: `Finance Approvals${financePending.length ? ` (${financePending.length})` : ''}` },
    ] : []),
  ];

  const filteredMyExpenses = filterCategory ? myExpenses.filter(e => e.categoryName === filterCategory) : myExpenses;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Expense Management</h1>
            <p>Submit and track your expense claims</p>
          </div>
          <button onClick={() => setShowSubmit(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-medium hover:bg-white/90 transition shadow-lg">
            <Plus size={16} /> Submit Expense
          </button>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Receipt size={100} className="text-white" />
        </div>
      </div>

      {/* Approval Flow Info */}
      <div className="card bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-indigo-700 dark:text-indigo-400">Approval Flow:</span>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 flex-wrap">
            <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded text-xs font-medium">Employee Submits</span>
            <ArrowRight size={14} />
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-medium text-amber-700 dark:text-amber-400">Manager Approval</span>
            <ArrowRight size={14} />
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs font-medium text-blue-700 dark:text-blue-400">Finance Approval</span>
            <ArrowRight size={14} />
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-xs font-medium text-emerald-700 dark:text-emerald-400">Approved</span>
          </div>
        </div>
      </div>

      {/* Admin Summary Stats */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card stat-card-emerald dark:border-emerald-800 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Approved</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatCurrency(totalApproved)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Check size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
          <div className="card stat-card-amber dark:border-amber-800 animate-slide-up" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending Amount</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{formatCurrency(totalPending)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
          <div className="card stat-card-blue dark:border-blue-800 animate-slide-up" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">This Month</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatCurrency(thisMonthTotal)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* My Expenses */}
      {tab === 'my' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input w-auto text-sm">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {filteredMyExpenses.map(e => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-sm font-medium dark:text-white">{e.categoryName || e.category}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate hidden sm:table-cell">{e.description}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{e.expenseDate || e.date}</td>
                    <td className="px-4 py-3">{getStatusBadge(e.status)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-xs space-y-1">
                        {e.managerRemarks && <p className="text-slate-500 dark:text-slate-400"><span className="font-medium">Manager:</span> {e.managerRemarks}</p>}
                        {e.financeRemarks && <p className="text-slate-500 dark:text-slate-400"><span className="font-medium">Finance:</span> {e.financeRemarks}</p>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMyExpenses.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No expenses submitted yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team Requests - Manager */}
      {tab === 'team' && isManager && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold dark:text-white">Pending Manager Approval</h3>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {managerPending.map(e => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium dark:text-white">{e.employeeName}</p>
                      <p className="text-xs text-slate-400">{e.department}</p>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{e.categoryName || e.category}</td>
                    <td className="px-4 py-3 text-sm font-semibold dark:text-slate-200">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{e.expenseDate || e.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate hidden sm:table-cell">{e.description}</td>
                    <td className="px-4 py-3">{getStatusBadge(e.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openRemarkModal(e, 'approved', 'manager')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition" title="Approve"><Check size={16} /></button>
                        <button onClick={() => openRemarkModal(e, 'rejected', 'manager')} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Reject"><XIcon size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {managerPending.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">No pending requests for manager approval</td></tr>}
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold dark:text-white mt-6">All Team Expenses</h3>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {teamExpenses.filter(e => e.status !== 'pending_manager').map(e => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium dark:text-white">{e.employeeName}</p>
                      <p className="text-xs text-slate-400">{e.department}</p>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{e.categoryName || e.category}</td>
                    <td className="px-4 py-3 text-sm font-semibold dark:text-slate-200">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{e.expenseDate || e.date}</td>
                    <td className="px-4 py-3">{getStatusBadge(e.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Finance Approvals - Admin */}
      {tab === 'finance' && isAdmin && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold dark:text-white">Pending Finance Approval</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">These expenses have been approved by the manager and need your final approval.</p>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Manager Approved By</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {financePending.map(e => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium dark:text-white">{e.employeeName}</p>
                      <p className="text-xs text-slate-400">{e.department}</p>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{e.categoryName || e.category}</td>
                    <td className="px-4 py-3 text-sm font-semibold dark:text-slate-200">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{e.expenseDate || e.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate hidden sm:table-cell">{e.description}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{e.managerApprovedByName}</p>
                      {e.managerRemarks && <p className="text-xs text-slate-400">{e.managerRemarks}</p>}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(e.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openRemarkModal(e, 'approved', 'finance')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition" title="Approve"><Check size={16} /></button>
                        <button onClick={() => openRemarkModal(e, 'rejected', 'finance')} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Reject"><XIcon size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {financePending.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-slate-400 text-sm">No pending requests for finance approval</td></tr>}
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold dark:text-white mt-6">All Expense Claims</h3>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Manager</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Finance</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {allExpenses.filter(e => e.status !== 'pending_finance').map(e => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium dark:text-white">{e.employeeName}</p>
                      <p className="text-xs text-slate-400">{e.department}</p>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-slate-300">{e.categoryName || e.category}</td>
                    <td className="px-4 py-3 text-sm font-semibold dark:text-slate-200">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{e.expenseDate || e.date}</td>
                    <td className="px-4 py-3">{getStatusBadge(e.status)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 dark:text-slate-400">{e.managerApprovedByName || '-'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 dark:text-slate-400">{e.financeApprovedByName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide Panel for Submit Expense */}
      {showSubmit && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowSubmit(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-slate-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold dark:text-white">Submit Expense</h2>
              <button onClick={() => setShowSubmit(false)}><XIcon size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input mt-1">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="input mt-1" placeholder="Describe the expense..." />
              </div>
              {form.amount && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Amount: {formatCurrency(Number(form.amount))}</p>
                </div>
              )}
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">Your expense claim will first go to your manager for approval, then to finance for final approval.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
              <button onClick={() => setShowSubmit(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmit} className="btn-primary" disabled={!form.category || !form.amount || !form.date}>Submit</button>
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
              {remarkModal.action === 'approved' ? 'Approve' : 'Reject'} Expense Claim
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {remarkModal.expense.employeeName} - {remarkModal.expense.category} ({formatCurrency(remarkModal.expense.amount)})
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
