import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Ticket, Plus, Search, Filter, MessageSquare, Clock, User, ChevronRight,
  AlertCircle, CheckCircle2, Circle, ArrowRight, Send, X, Tag,
  Loader2, MoreVertical, ArrowUpRight, RotateCcw, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'it', label: 'IT Support', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'hr', label: 'HR', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'finance', label: 'Finance', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'admin', label: 'Admin/Facilities', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'general', label: 'General', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

const STATUSES = [
  { value: 'open', label: 'Open', icon: Circle, color: 'text-blue-500' },
  { value: 'in_progress', label: 'In Progress', icon: Loader2, color: 'text-amber-500' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-500' },
  { value: 'closed', label: 'Closed', icon: CheckCircle2, color: 'text-slate-400' },
  { value: 'reopened', label: 'Reopened', icon: RotateCcw, color: 'text-red-500' },
];

function StatusBadge({ status }) {
  const s = STATUSES.find(st => st.value === status);
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color} bg-current/10`}>
      <Icon size={12} className={status === 'in_progress' ? 'animate-spin' : ''} />
      <span>{s.label}</span>
    </span>
  );
}

function CategoryBadge({ category }) {
  const c = CATEGORIES.find(ct => ct.value === category);
  if (!c) return null;
  return <span className={`badge ${c.color}`}>{c.label}</span>;
}

function PriorityBadge({ priority }) {
  const p = PRIORITIES.find(pr => pr.value === priority);
  if (!p) return null;
  return <span className={`badge ${p.color}`}>{p.label}</span>;
}

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Tickets() {
  const { user, isAdmin, isManager } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const commentEndRef = useRef(null);

  // New ticket form
  const [form, setForm] = useState({ title: '', description: '', category: 'general', priority: 'normal' });

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    Promise.all([
      api.get('/tickets'),
      api.get('/tickets/stats'),
      (isAdmin || isManager) ? api.get('/employees') : Promise.resolve({ data: [] }),
    ]).then(([t, s, e]) => {
      setTickets(t.data);
      setStats(s.data);
      setEmployees(e.data?.filter?.(emp => emp.role !== 'employee') || e.data || []);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load tickets');
      setLoading(false);
    });
  };

  const loadTicketDetail = (id) => {
    api.get(`/tickets/${id}`).then(r => {
      setTicketDetail(r.data);
      setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }).catch(() => toast.error('Failed to load ticket details'));
  };

  useEffect(() => {
    if (selectedTicket) loadTicketDetail(selectedTicket);
  }, [selectedTicket]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) return toast.error('Fill all required fields');
    setSubmitting(true);
    try {
      await api.post('/tickets', form);
      toast.success('Ticket created!');
      setShowCreate(false);
      setForm({ title: '', description: '', category: 'general', priority: 'normal' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create ticket');
    }
    setSubmitting(false);
  };

  const handleAssign = async (ticketId, assignedTo) => {
    try {
      await api.put(`/tickets/assign/${ticketId}`, { assignedTo });
      toast.success('Ticket assigned');
      loadData();
      if (selectedTicket === ticketId) loadTicketDetail(ticketId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleStatusChange = async (ticketId, status) => {
    try {
      await api.put(`/tickets/status/${ticketId}`, { status });
      toast.success(`Ticket ${status}`);
      loadData();
      if (selectedTicket === ticketId) loadTicketDetail(ticketId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/tickets/comment/${selectedTicket}`, { comment });
      setComment('');
      loadTicketDetail(selectedTicket);
      loadData();
    } catch (err) {
      toast.error('Failed to add comment');
    }
    setSubmitting(false);
  };

  const filtered = tickets.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.ticketId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statCards = [
    { label: 'Open', value: stats.open || 0, color: 'from-blue-500 to-cyan-500', icon: Circle },
    { label: 'In Progress', value: stats.inProgress || 0, color: 'from-amber-500 to-orange-500', icon: Loader2 },
    { label: 'Resolved', value: stats.resolved || 0, color: 'from-emerald-500 to-green-500', icon: CheckCircle2 },
    { label: 'Total', value: stats.total || 0, color: 'from-indigo-500 to-purple-500', icon: Ticket },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3"><Ticket size={28} /> Helpdesk & Support</h1>
            <p className="mt-1">Raise and track IT, HR, and admin support requests</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 !bg-white/20 hover:!bg-white/30 backdrop-blur-sm border border-white/30">
            <Plus size={18} /> Raise Ticket
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card card-interactive !p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-bold mt-1 dark:text-white">{s.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <Icon size={18} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card !p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="input !pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input !w-auto">
          <option value="all">All Status</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input !w-auto">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Ticket List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* List */}
        <div className={`lg:col-span-2 space-y-2 ${selectedTicket ? 'hidden lg:block' : ''}`}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Ticket size={64} />
              <p className="text-lg font-medium mt-2">No tickets found</p>
              <p className="text-sm">Create a new ticket to get started</p>
            </div>
          ) : filtered.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setSelectedTicket(t.id)}
              className={`w-full text-left card !p-4 transition-all hover:!border-indigo-300 dark:hover:!border-indigo-600 animate-slide-up ${selectedTicket === t.id ? '!border-indigo-500 !bg-indigo-50/50 dark:!bg-indigo-900/20' : ''}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                  t.priority === 'urgent' ? 'bg-red-500 animate-pulse' :
                  t.priority === 'high' ? 'bg-orange-500' :
                  t.priority === 'normal' ? 'bg-blue-500' : 'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{t.ticketId}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{t.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><User size={10} />{t.createdByName}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{timeAgo(t.createdAt)}</span>
                    <CategoryBadge category={t.category} />
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0 mt-2" />
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className={`lg:col-span-3 ${!selectedTicket ? 'hidden lg:block' : ''}`}>
          {!ticketDetail ? (
            <div className="card flex flex-col items-center justify-center py-20 text-slate-400">
              <MessageSquare size={48} className="mb-3 opacity-40" />
              <p className="font-medium">Select a ticket to view details</p>
            </div>
          ) : (
            <div className="card !p-0 overflow-hidden">
              {/* Detail Header */}
              <div className="p-5 border-b dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <button onClick={() => { setSelectedTicket(null); setTicketDetail(null); }} className="lg:hidden text-sm text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
                      <ChevronRight size={14} className="rotate-180" /> Back
                    </button>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{ticketDetail.ticketId}</span>
                      <StatusBadge status={ticketDetail.status} />
                      <PriorityBadge priority={ticketDetail.priority} />
                      <CategoryBadge category={ticketDetail.category} />
                    </div>
                    <h2 className="text-lg font-bold mt-2 dark:text-white">{ticketDetail.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Raised by <span className="font-medium text-slate-600 dark:text-slate-300">{ticketDetail.createdByName}</span> ({ticketDetail.createdByDept}) &middot; {timeAgo(ticketDetail.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  {(isAdmin || isManager || ticketDetail.assignedTo === user?.id || ticketDetail.createdBy === user?.id) && (
                    <div className="flex items-center gap-2 shrink-0">
                      {ticketDetail.status === 'open' || ticketDetail.status === 'reopened' ? (
                        <>
                          {(isAdmin || isManager) && (
                            <select
                              onChange={e => { if (e.target.value) handleAssign(ticketDetail.id, parseInt(e.target.value)); }}
                              className="input !w-auto !text-xs !py-1.5"
                              defaultValue=""
                            >
                              <option value="" disabled>Assign to...</option>
                              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                          )}
                          {(ticketDetail.assignedTo === user?.id || isAdmin) && (
                            <button onClick={() => handleStatusChange(ticketDetail.id, 'in_progress')} className="btn-primary !text-xs !py-1.5">
                              Start Working
                            </button>
                          )}
                        </>
                      ) : ticketDetail.status === 'in_progress' ? (
                        <button onClick={() => handleStatusChange(ticketDetail.id, 'resolved')} className="btn-success !text-xs !py-1.5 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Resolve
                        </button>
                      ) : ticketDetail.status === 'resolved' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleStatusChange(ticketDetail.id, 'closed')} className="btn-secondary !text-xs !py-1.5">
                            Close
                          </button>
                          {ticketDetail.createdBy === user?.id && (
                            <button onClick={() => handleStatusChange(ticketDetail.id, 'reopened')} className="btn-danger !text-xs !py-1.5 flex items-center gap-1">
                              <RotateCcw size={14} /> Reopen
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {ticketDetail.assignedToName && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Assigned to:</span>
                    <span className="inline-flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                      <User size={10} /> {ticketDetail.assignedToName}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="px-5 py-4 border-b dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{ticketDetail.description}</p>
              </div>

              {/* Comments */}
              <div className="px-5 py-3 max-h-80 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Comments ({ticketDetail.comments?.length || 0})
                </p>
                {ticketDetail.comments?.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No comments yet</p>
                ) : (
                  <div className="space-y-3">
                    {ticketDetail.comments?.map(c => (
                      <div key={c.id} className={`flex gap-3 ${c.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {c.userName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className={`max-w-[75%] ${c.userId === user?.id ? 'text-right' : ''}`}>
                          <div className={`rounded-2xl px-4 py-2.5 ${
                            c.userId === user?.id
                              ? 'bg-indigo-600 text-white rounded-tr-md'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-md'
                          }`}>
                            <p className="text-sm">{c.comment}</p>
                          </div>
                          <p className={`text-[10px] mt-1 text-slate-400 ${c.userId === user?.id ? 'text-right' : ''}`}>
                            {c.userName} &middot; {timeAgo(c.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={commentEndRef} />
                  </div>
                )}
              </div>

              {/* Comment Input */}
              {ticketDetail.status !== 'closed' && (
                <div className="px-5 py-3 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex gap-2">
                    <input
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                      placeholder="Write a comment..."
                      className="input flex-1"
                    />
                    <button onClick={handleComment} disabled={submitting || !comment.trim()} className="btn-primary !px-3">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
            <div className="p-6 border-b dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold dark:text-white flex items-center gap-2"><Ticket size={20} /> Raise New Ticket</h2>
                <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="Brief summary of the issue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input !h-28 resize-none" placeholder="Detailed description of the issue..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input">
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={submitting} className="btn-primary flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
