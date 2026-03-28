import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Shield, Upload, Download, Trash2, X, Edit3, Plus, Search, FileText, File, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['General', 'HR', 'IT', 'Finance', 'Security', 'Compliance', 'Leave', 'Travel', 'Other'];

const categoryColors = {
  General: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  HR: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  IT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Finance: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Security: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Compliance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Leave: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  Travel: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  Other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const formatSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export default function CompanyPolicies() {
  const { isAdmin } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'General' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadPolicies(); }, []);

  const loadPolicies = () => {
    api.get('/policies').then(r => setPolicies(r.data)).catch(() => setPolicies([]));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', category: 'General' });
    setSelectedFile(null);
    setShowForm(true);
  };

  const openEdit = (policy) => {
    setEditing(policy);
    setForm({ title: policy.title, description: policy.description || '', category: policy.category });
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title) return toast.error('Title is required');
    if (!editing && !selectedFile) return toast.error('Please select a file');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      if (selectedFile) formData.append('file', selectedFile);

      if (editing) {
        await api.put(`/policies/${editing.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Policy updated successfully');
      } else {
        await api.post('/policies', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Policy uploaded successfully');
      }
      setShowForm(false);
      loadPolicies();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (policy) => {
    try {
      const res = await api.get(`/policies/download/${policy.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', policy.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download policy');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await api.delete(`/policies/${id}`);
      toast.success('Policy deleted');
      loadPolicies();
    } catch {
      toast.error('Failed to delete policy');
    }
  };

  const filtered = policies.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Company Policies</h1>
            <p>View and access all company policies and guidelines</p>
          </div>
          {isAdmin && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-white/90 transition shadow-lg">
              <Plus size={16} /> Add Policy
            </button>
          )}
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Shield size={100} className="text-white" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search policies..." className="input pl-9" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input w-auto">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{policies.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Policies</p>
        </div>
        {['HR', 'IT', 'Security'].map(cat => (
          <div key={cat} className="card text-center">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{policies.filter(p => p.category === cat).length}</p>
            <p className="text-xs text-gray-500 mt-1">{cat} Policies</p>
          </div>
        ))}
      </div>

      {/* Policies Grid */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderOpen size={64} />
            <p className="text-lg font-medium mt-2">No policies found</p>
            <p className="text-sm">{isAdmin ? 'Upload company policies for employees to view' : 'No policies have been uploaded yet'}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((policy, i) => (
            <div key={policy.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white truncate">{policy.title}</h3>
                  {policy.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{policy.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`badge ${categoryColors[policy.category] || categoryColors.Other}`}>{policy.category}</span>
                    <span className="text-xs text-gray-400">{formatSize(policy.fileSize)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t dark:border-gray-700">
                <div className="text-xs text-gray-400">
                  {policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  {policy.uploadedByName && <span className="ml-1">by {policy.uploadedByName}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleDownload(policy)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition" title="Download">
                    <Download size={15} />
                  </button>
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(policy)} className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded transition" title="Edit">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDelete(policy.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Edit Slide Panel */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">{editing ? 'Edit Policy' : 'Upload New Policy'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input mt-1" placeholder="e.g. Leave Policy 2026" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input mt-1">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="input mt-1" placeholder="Brief description of this policy..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{editing ? 'Replace File (optional)' : 'Policy File *'}</label>
                <div className="mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition cursor-pointer"
                  onClick={() => document.getElementById('policy-file-input').click()}>
                  <input id="policy-file-input" type="file" className="hidden" onChange={e => setSelectedFile(e.target.files[0])} />
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{selectedFile.name}</p>
                      <p className="text-xs text-gray-400">{formatSize(selectedFile.size)}</p>
                    </div>
                  ) : editing ? (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Click to replace file</p>
                      <p className="text-xs text-gray-400 mt-1">Current: {editing.fileName}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Click to select a file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, XLS up to 20MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmit} className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editing ? 'Update Policy' : 'Upload Policy'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
