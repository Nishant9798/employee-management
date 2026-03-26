import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, Edit2, Trash2, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Announcements() {
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal' });

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = () => api.get('/announcements').then(r => setAnnouncements(r.data));

  const openAdd = () => { setEditing(null); setForm({ title: '', content: '', priority: 'normal' }); setShowModal(true); };
  const openEdit = (a) => { setEditing(a); setForm({ title: a.title, content: a.content, priority: a.priority }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/announcements/${editing.id}`, form);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements', form);
        toast.success('Announcement posted');
      }
      setShowModal(false);
      loadAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    toast.success('Announcement deleted');
    loadAnnouncements();
  };

  const priorityColor = (p) => {
    switch (p) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'normal': return 'priority-normal';
      default: return 'priority-low';
    }
  };

  const priorityBorder = (p) => {
    switch (p) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'normal': return 'border-l-blue-500';
      default: return 'border-l-gray-400';
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1>Announcements</h1>
            <p>Company news and updates</p>
          </div>
          {isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-white/90 transition shadow-lg">
              <Plus size={16} /> New Announcement
            </button>
          )}
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Megaphone size={100} className="text-white" />
        </div>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Megaphone size={64} />
            <p className="text-lg font-medium mt-2">No announcements yet</p>
            <p className="text-sm">Check back later for updates</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a, i) => (
            <div key={a.id} className={`card border-l-4 ${priorityBorder(a.priority)} hover:shadow-md transition-all duration-300 animate-slide-up`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`badge ${priorityColor(a.priority)}`}>{a.priority}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={12} /> {timeAgo(a.createdAt)}
                    </span>
                    {a.authorName && (
                      <span className="text-xs text-gray-400">by {a.authorName}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{a.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{a.content}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide Panel Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50 max-w-md">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input mt-1" placeholder="Announcement title" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Content</label>
                <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={5} className="input mt-1" placeholder="Write your announcement..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Priority</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="input mt-1">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary" disabled={!form.title || !form.content}>{editing ? 'Update' : 'Post'}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
