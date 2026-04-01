import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Edit2, Trash2, X, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Holidays() {
  const { isAdmin } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', date: '', type: 'national' });

  useEffect(() => { loadHolidays(); }, []);

  const loadHolidays = () => api.get('/holidays').then(r => setHolidays(r.data)).catch(() => {});

  const openAdd = () => { setEditing(null); setForm({ name: '', date: '', type: 'national' }); setShowModal(true); };
  const openEdit = (h) => { setEditing(h); setForm(h); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/holidays/${editing.id}`, form);
        toast.success('Holiday updated');
      } else {
        await api.post('/holidays', form);
        toast.success('Holiday added');
      }
      setShowModal(false);
      loadHolidays();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await api.delete(`/holidays/${id}`);
      toast.success('Holiday deleted');
      loadHolidays();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = holidays.filter(h => h.date >= today);
  const past = holidays.filter(h => h.date < today);

  const typeColor = (t) => t === 'national' ? 'badge-danger' : t === 'optional' ? 'badge-info' : 'badge-gray';
  const typeBg = (t) => t === 'national' ? 'from-red-500 to-pink-500' : t === 'optional' ? 'from-blue-500 to-cyan-500' : 'from-gray-400 to-gray-500';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1>Holiday Calendar</h1>
            <p>{holidays.length} holidays in 2026</p>
          </div>
          {isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-white/90 transition shadow-lg">
              <Plus size={16} /> Add Holiday
            </button>
          )}
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Building2 size={100} className="text-white" />
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Upcoming Holidays</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((h, i) => (
              <div key={h.id} className="card flex items-start gap-4 hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${typeBg(h.type)} flex flex-col items-center justify-center shrink-0 shadow-sm`}>
                  <span className="text-xs font-bold text-white/80">{new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                  <span className="text-lg font-bold text-white leading-tight">{new Date(h.date).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 dark:text-white">{h.name}</h3>
                  <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                  <span className={`badge mt-1 ${typeColor(h.type)}`}>{h.type}</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(h)} className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(h.id)} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Past Holidays</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Holiday</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Day</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Type</th>
              </tr></thead>
              <tbody className="divide-y dark:divide-gray-700">
                {past.map(h => (
                  <tr key={h.id} className="text-gray-400 dark:text-gray-500">
                    <td className="px-4 py-2.5 text-sm">{h.date}</td>
                    <td className="px-4 py-2.5 text-sm">{h.name}</td>
                    <td className="px-4 py-2.5 text-sm">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}</td>
                    <td className="px-4 py-2.5"><span className={`badge ${typeColor(h.type)}`}>{h.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide Panel Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50 max-w-sm">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">{editing ? 'Edit Holiday' : 'Add Holiday'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Holiday Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input mt-1">
                  <option value="national">National</option>
                  <option value="optional">Optional</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">{editing ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
