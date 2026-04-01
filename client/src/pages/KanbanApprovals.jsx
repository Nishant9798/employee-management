import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  KanbanSquare,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Receipt,
  Wallet,
  GripVertical,
  User,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Inbox,
  IndianRupee,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  leave: {
    label: 'Leave',
    icon: CalendarDays,
    gradient: 'from-blue-500 to-cyan-500',
    border: 'border-blue-400 dark:border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    ring: 'ring-blue-400/30',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  expense: {
    label: 'Expense',
    icon: Receipt,
    gradient: 'from-emerald-500 to-teal-500',
    border: 'border-emerald-400 dark:border-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    ring: 'ring-emerald-400/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  loan: {
    label: 'Loan',
    icon: Wallet,
    gradient: 'from-purple-500 to-pink-500',
    border: 'border-purple-400 dark:border-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    ring: 'ring-purple-400/30',
    text: 'text-purple-700 dark:text-purple-400',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
};

const COLUMN_CONFIG = {
  pending: {
    title: 'Pending',
    icon: Clock,
    color: 'amber',
    headerGradient: 'from-amber-500 to-orange-500',
    headerBg: 'bg-amber-50 dark:bg-amber-900/10',
    dotColor: 'bg-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
  },
  approved: {
    title: 'Approved',
    icon: CheckCircle2,
    color: 'emerald',
    headerGradient: 'from-emerald-500 to-green-500',
    headerBg: 'bg-emerald-50 dark:bg-emerald-900/10',
    dotColor: 'bg-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800/50',
  },
  rejected: {
    title: 'Rejected',
    icon: XCircle,
    color: 'red',
    headerGradient: 'from-red-500 to-rose-500',
    headerBg: 'bg-red-50 dark:bg-red-900/10',
    dotColor: 'bg-red-400',
    borderColor: 'border-red-200 dark:border-red-800/50',
  },
};

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'leave', label: 'Leaves' },
  { id: 'expense', label: 'Expenses' },
  { id: 'loan', label: 'Loans' },
];

const LOAN_TYPE_LABELS = {
  salary_advance: 'Salary Advance',
  personal_loan: 'Personal Loan',
  emergency_loan: 'Emergency Loan',
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeStatus(status) {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  if (s === 'approved' || s === 'active' || s === 'completed') return 'approved';
  if (s === 'rejected') return 'rejected';
  return 'pending';
}

// Normalize all items to a unified card format
function normalizeLeave(leave) {
  return {
    id: `leave-${leave.id}`,
    rawId: leave.id,
    type: 'leave',
    employeeName: leave.employeeName || leave.employee_name || `${leave.firstName || ''} ${leave.lastName || ''}`.trim() || 'Employee',
    title: leave.leaveTypeName || leave.leave_type || 'Leave Request',
    subtitle: `${formatDate(leave.fromDate || leave.from_date)} - ${formatDate(leave.toDate || leave.to_date)}`,
    detail: `${leave.days || leave.totalDays || ''} day(s)`,
    reason: leave.reason || '',
    status: normalizeStatus(leave.status),
    rawStatus: leave.status,
    date: leave.createdAt || leave.created_at || leave.fromDate || leave.from_date,
    remarks: leave.remarks || leave.managerRemarks || leave.hrRemarks || '',
  };
}

function normalizeExpense(expense) {
  return {
    id: `expense-${expense.id}`,
    rawId: expense.id,
    type: 'expense',
    employeeName: expense.employeeName || expense.employee_name || `${expense.firstName || ''} ${expense.lastName || ''}`.trim() || 'Employee',
    title: expense.categoryName || expense.category || 'Expense Claim',
    subtitle: formatCurrency(Number(expense.amount || 0)),
    detail: formatDate(expense.date || expense.expenseDate || expense.expense_date),
    reason: expense.description || '',
    status: normalizeStatus(expense.status),
    rawStatus: expense.status,
    date: expense.createdAt || expense.created_at || expense.date,
    remarks: expense.remarks || expense.managerRemarks || expense.financeRemarks || '',
  };
}

function normalizeLoan(loan) {
  return {
    id: `loan-${loan.id}`,
    rawId: loan.id,
    type: 'loan',
    employeeName: loan.employeeName || loan.employee_name || `${loan.firstName || ''} ${loan.lastName || ''}`.trim() || 'Employee',
    title: LOAN_TYPE_LABELS[loan.type] || loan.type || 'Loan Request',
    subtitle: formatCurrency(Number(loan.amount || 0)),
    detail: loan.emiMonths ? `${loan.emiMonths} month EMI` : '',
    reason: loan.reason || '',
    status: normalizeStatus(loan.status),
    rawStatus: loan.status,
    date: loan.createdAt || loan.created_at,
    remarks: loan.remarks || '',
  };
}

// Card component
function KanbanCard({ card, onDragStart, columnId }) {
  const config = TYPE_CONFIG[card.type];
  const Icon = config.icon;
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify({ cardId: card.id, fromColumn: columnId }));
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) onDragStart(card.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable={columnId === 'pending'}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        group relative rounded-xl p-0.5 transition-all duration-300 ease-out
        ${isDragging ? 'opacity-40 scale-95 rotate-1' : 'opacity-100 scale-100'}
        ${columnId === 'pending' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        bg-gradient-to-br ${config.gradient}
        hover:shadow-lg hover:shadow-${config.border.split('-')[1]}-500/20 hover:-translate-y-0.5
      `}
      style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-[10px] p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {columnId === 'pending' && (
              <GripVertical size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.badge}`}>
              <Icon size={12} />
              {config.label}
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
            columnId === 'pending' ? 'bg-amber-400 animate-pulse' :
            columnId === 'approved' ? 'bg-emerald-400' : 'bg-red-400'
          }`} />
        </div>

        {/* Employee name */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-gray-500 dark:text-gray-400" />
          </div>
          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {card.employeeName}
          </span>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{card.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${config.text}`}>{card.subtitle}</span>
            {card.detail && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {card.detail}
              </span>
            )}
          </div>
          {card.reason && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {card.reason}
            </p>
          )}
        </div>

        {/* Remarks if any */}
        {card.remarks && columnId !== 'pending' && (
          <div className="flex items-start gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
            <MessageSquare size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-400 dark:text-gray-500 italic line-clamp-2">{card.remarks}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Empty state for column
function EmptyColumn({ columnId }) {
  const messages = {
    pending: 'No pending approvals',
    approved: 'No approved items yet',
    rejected: 'No rejected items',
  };
  const icons = {
    pending: Clock,
    approved: CheckCircle2,
    rejected: XCircle,
  };
  const Icon = icons[columnId];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-300 dark:text-gray-600" />
      </div>
      <p className="text-sm font-medium text-gray-400 dark:text-gray-500">{messages[columnId]}</p>
      <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
        {columnId === 'pending' ? 'All caught up!' : columnId === 'approved' ? 'Drag pending items here to approve' : 'Drag pending items here to reject'}
      </p>
    </div>
  );
}

// Confirmation Modal
function ConfirmModal({ isOpen, onClose, onConfirm, action, card }) {
  const [remarks, setRemarks] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setRemarks('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen || !card) return null;

  const isApprove = action === 'approved';
  const config = TYPE_CONFIG[card.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
        {/* Header */}
        <div className={`p-5 bg-gradient-to-r ${isApprove ? 'from-emerald-500 to-green-500' : 'from-red-500 to-rose-500'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              {isApprove ? <CheckCircle2 size={22} className="text-white" /> : <XCircle size={22} className="text-white" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isApprove ? 'Approve' : 'Reject'} {config.label}
              </h3>
              <p className="text-sm text-white/80">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Card summary */}
          <div className={`p-3 rounded-xl ${config.bg} border ${config.border}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">{card.employeeName}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${config.badge}`}>{config.label}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{card.title} - {card.subtitle}</p>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Remarks {!isApprove && <span className="text-red-500">*</span>}
            </label>
            <textarea
              ref={textareaRef}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isApprove ? 'Add optional remarks...' : 'Please provide a reason for rejection...'}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!isApprove && !remarks.trim()) {
                toast.error('Please provide remarks for rejection');
                return;
              }
              onConfirm(remarks.trim());
            }}
            className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition shadow-lg ${
              isApprove
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-emerald-500/25'
                : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-red-500/25'
            }`}
          >
            {isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>

      {/* Inline animation styles */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
}

// Kanban Column
function KanbanColumn({ columnId, cards, onDrop, onDragStart }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const config = COLUMN_CONFIG[columnId];
  const Icon = config.icon;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only set false if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.fromColumn !== columnId) {
        onDrop(data.cardId, data.fromColumn, columnId);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex flex-col rounded-2xl border-2 transition-all duration-300 min-h-[400px]
        bg-gray-50/50 dark:bg-gray-900/50
        ${isDragOver
          ? `border-dashed ${config.borderColor} shadow-lg scale-[1.01] bg-${config.color}-50/50 dark:bg-${config.color}-900/10`
          : 'border-gray-200 dark:border-gray-700/50'
        }
      `}
    >
      {/* Column Header */}
      <div className={`p-4 rounded-t-2xl ${config.headerBg} border-b border-gray-200 dark:border-gray-700/50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.headerGradient} flex items-center justify-center shadow-sm`}>
              <Icon size={16} className="text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">{config.title}</h3>
          </div>
          <span className={`
            min-w-[28px] h-7 flex items-center justify-center rounded-full text-xs font-bold
            bg-gradient-to-r ${config.headerGradient} text-white shadow-sm
          `}>
            {cards.length}
          </span>
        </div>
        {isDragOver && columnId !== 'pending' && (
          <div className={`mt-3 text-xs text-center font-medium text-${config.color}-600 dark:text-${config.color}-400 animate-pulse`}>
            Drop to {config.title.toLowerCase()}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-380px)]">
        {cards.length === 0 ? (
          <EmptyColumn columnId={columnId} />
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className="animate-cardEnter"
            >
              <KanbanCard
                card={card}
                columnId={columnId}
                onDragStart={onDragStart}
              />
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-cardEnter { animation: cardEnter 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
}

export default function KanbanApprovals() {
  const { user, isAdmin, isManager } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null, card: null });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const promises = [];
      promises.push(api.get('/leaves/all-applications').then(r => r.data).catch(() => []));
      promises.push(api.get('/expenses/all').then(r => r.data).catch(() => []));
      promises.push(api.get('/loans/all').then(r => r.data).catch(() => []));
      const [leavesData, expensesData, loansData] = await Promise.all(promises);
      setLeaves(leavesData);
      setExpenses(expensesData);
      setLoans(loansData);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  // Normalize all items
  const allCards = [
    ...leaves.map(normalizeLeave),
    ...expenses.map(normalizeExpense),
    ...loans.map(normalizeLoan),
  ];

  // Filter by active tab
  const tabFiltered = activeTab === 'all' ? allCards : allCards.filter(c => c.type === activeTab);

  // Filter by search
  const filtered = searchQuery.trim()
    ? tabFiltered.filter(c => {
        const q = searchQuery.toLowerCase();
        return (
          c.employeeName.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.reason.toLowerCase().includes(q) ||
          c.subtitle.toLowerCase().includes(q)
        );
      })
    : tabFiltered;

  // Split into columns
  const pendingCards = filtered.filter(c => c.status === 'pending');
  const approvedCards = filtered.filter(c => c.status === 'approved');
  const rejectedCards = filtered.filter(c => c.status === 'rejected');

  // Handle drop
  const handleDrop = (cardId, fromColumn, toColumn) => {
    if (fromColumn !== 'pending') {
      toast.error('You can only move pending items');
      return;
    }
    if (toColumn === 'pending') return;

    const card = allCards.find(c => c.id === cardId);
    if (!card) return;

    const action = toColumn === 'approved' ? 'approved' : 'rejected';
    setConfirmModal({ open: true, action, card });
  };

  // Execute approval/rejection
  const executeAction = async (remarks) => {
    const { card, action } = confirmModal;
    if (!card) return;

    try {
      if (card.type === 'leave') {
        const rawStatus = card.rawStatus;
        if (rawStatus === 'pending_manager' || rawStatus === 'pending') {
          await api.put(`/leaves/manager-action/${card.rawId}`, { status: action, remarks: remarks || undefined });
        } else if (rawStatus === 'pending_hr') {
          await api.put(`/leaves/hr-action/${card.rawId}`, { status: action, remarks: remarks || undefined });
        } else {
          await api.put(`/leaves/manager-action/${card.rawId}`, { status: action, remarks: remarks || undefined });
        }
      } else if (card.type === 'expense') {
        const rawStatus = card.rawStatus;
        if (rawStatus === 'pending_finance') {
          await api.put(`/expenses/finance-action/${card.rawId}`, { status: action, remarks: remarks || undefined });
        } else {
          await api.put(`/expenses/manager-action/${card.rawId}`, { status: action, remarks: remarks || undefined });
        }
      } else if (card.type === 'loan') {
        await api.put(`/loans/${card.rawId}/action`, { status: action, remarks: remarks || undefined });
      }

      toast.success(action === 'approved' ? 'Approved successfully!' : 'Rejected successfully');
      setConfirmModal({ open: false, action: null, card: null });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed. Please try again.');
    }
  };

  // Tab counts
  const tabCounts = {
    all: allCards.filter(c => c.status === 'pending').length,
    leave: allCards.filter(c => c.type === 'leave' && c.status === 'pending').length,
    expense: allCards.filter(c => c.type === 'expense' && c.status === 'pending').length,
    loan: allCards.filter(c => c.type === 'loan' && c.status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <div className="relative z-10">
            <h1>Kanban Approvals</h1>
            <p>Loading approval requests...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <RefreshCw size={20} className="animate-spin" />
            <span className="text-sm font-medium">Loading approvals...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Kanban Approvals</h1>
            <p>Drag and drop to approve or reject requests</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-white/90 transition shadow-lg disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <KanbanSquare size={100} className="text-white" />
        </div>
      </div>

      {/* Approval Flow Info */}
      <div className="card bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="font-medium text-indigo-700 dark:text-indigo-400">How it works:</span>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 flex-wrap">
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-medium text-amber-700 dark:text-amber-400">Pending</span>
            <ArrowRight size={14} className="text-gray-400" />
            <span className="text-xs">Drag to</span>
            <ArrowRight size={14} className="text-gray-400" />
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-xs font-medium text-emerald-700 dark:text-emerald-400">Approved</span>
            <span className="text-xs text-gray-400">or</span>
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-xs font-medium text-red-700 dark:text-red-400">Rejected</span>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span className={`
                  ml-1.5 px-1.5 py-0.5 text-xs rounded-full font-bold
                  ${activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }
                `}>
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, type, reason..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 ml-auto">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {pendingCards.length} pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {approvedCards.length} approved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            {rejectedCards.length} rejected
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KanbanColumn
          columnId="pending"
          cards={pendingCards}
          onDrop={handleDrop}
        />
        <KanbanColumn
          columnId="approved"
          cards={approvedCards}
          onDrop={handleDrop}
        />
        <KanbanColumn
          columnId="rejected"
          cards={rejectedCards}
          onDrop={handleDrop}
        />
      </div>

      {/* No results state */}
      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Inbox size={36} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">No approvals found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {searchQuery ? 'Try adjusting your search query' : 'There are no approval requests to display'}
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        action={confirmModal.action}
        card={confirmModal.card}
        onClose={() => setConfirmModal({ open: false, action: null, card: null })}
        onConfirm={executeAction}
      />
    </div>
  );
}
