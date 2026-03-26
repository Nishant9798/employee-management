import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Holidays() {
  const { isAdmin } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', date: '', type: 'national' });

  useEffect(() => { loadHolidays(); }, []);

  const loadHolidays = () => api.get('/holidays').then(r => setHolidays(r.data));

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
    await api.delete(`/holidays/${id}`);
    toast.success('Holiday deleted');
    loadHolidays();
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = holidays.filter(h => h.date >= today);
  const past = holidays.filter(h => h.date < today);

  const typeColor = (t) => t === 'national' ? 'badge-danger' : t === 'optional' ? 'badge-info' : 'badge-gray';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Holiday Calendar</h1>
          <p className="text-sm text-gray-500">{holidays.length} holidays in 2026</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Holiday</button>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Upcoming Holidays</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map(h => (
              <div key={h.id} className="card flex items-start gap-4 hover:shadow-md transition">
                <div className="w-14 h-14 rounded-xl bg-indigo-50 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-indigo-600">{new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                  <span className="text-lg font-bold text-indigo-800 leading-tight">{new Date(h.date).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800">{h.name}</h3>
                  <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                  <span className={`badge mt-1 ${typeColor(h.type)}`}>{h.type}</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(h)} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(h.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Past Holidays</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">Holiday</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">Day</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">Type</th>
              </tr></thead>
              <tbody className="divide-y">
                {past.map(h => (
                  <tr key={h.id} className="text-gray-400">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Holiday' : 'Add Holiday'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Holiday Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input mt-1">
                  <option value="national">National</option>
                  <option value="optional">Optional</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">{editing ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
