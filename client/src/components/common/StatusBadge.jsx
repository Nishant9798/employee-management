import { Check, X, Clock, AlertCircle, Loader2, Circle } from 'lucide-react';

const STATUS_CONFIG = {
  // Leave & Expense statuses
  pending_manager: { label: 'Pending Manager', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  pending_hr: { label: 'Pending HR', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  pending_finance: { label: 'Pending Finance', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: X },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
  inactive: { label: 'Inactive', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', icon: X },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', icon: X },

  // Attendance statuses
  present: { label: 'Present', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
  absent: { label: 'Absent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: X },
  halfday: { label: 'Half Day', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  late: { label: 'Late', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
  weekend: { label: 'Weekend', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', icon: Circle },
  holiday: { label: 'Holiday', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Circle },

  // Ticket statuses
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Circle },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Loader2 },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', icon: Check },
  reopened: { label: 'Reopened', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },

  // Loan statuses
  disbursed: { label: 'Disbursed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Check },

  // Training
  enrolled: { label: 'Enrolled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Circle },
  dropped: { label: 'Dropped', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: X },
  upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  ongoing: { label: 'Ongoing', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Loader2 },

  // Performance
  self_review: { label: 'Self Review', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  manager_review: { label: 'Manager Review', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Clock },

  // Payslip
  generated: { label: 'Generated', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Circle },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },

  // Priority
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', icon: Circle },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Circle },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
};

export default function StatusBadge({ status, label, size = 'sm', showIcon = true }) {
  const config = STATUS_CONFIG[status] || {
    label: status?.replace(/_/g, ' ') || 'Unknown',
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    icon: Circle,
  };
  const Icon = config.icon;
  const displayLabel = label || config.label;

  const sizeClasses = size === 'xs'
    ? 'px-1.5 py-0.5 text-[10px]'
    : size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full capitalize ${config.color} ${sizeClasses}`}
      role="status"
      aria-label={displayLabel}
    >
      {showIcon && <Icon size={size === 'xs' ? 10 : size === 'sm' ? 12 : 14} />}
      {displayLabel}
    </span>
  );
}

export { STATUS_CONFIG };
