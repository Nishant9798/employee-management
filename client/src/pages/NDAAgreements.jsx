import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { FileSignature, Upload, Download, Trash2, X, Edit3, Plus, Search, FileText, CheckCircle, Clock, Users, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const formatSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export default function NDAAgreements() {
  const { user, isAdmin } = useAuth();
  const [agreements, setAgreements] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmit, setShowSubmit] = useState(null);
  const [submitFile, setSubmitFile] = useState(null);
  const [showSubmissions, setShowSubmissions] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => { loadAgreements(); }, []);

  const loadAgreements = () => {
    api.get('/agreements').then(r => setAgreements(r.data)).catch(() => setAgreements([]));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '' });
    setSelectedFile(null);
    setShowForm(true);
  };

  const openEdit = (agreement) => {
    setEditing(agreement);
    setForm({ title: agreement.title, description: agreement.description || '' });
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title) return toast.error('Title is required');
    if (!editing && !selectedFile) return toast.error('Please select a Word document');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      if (selectedFile) formData.append('file', selectedFile);

      if (editing) {
        await api.put(`/agreements/${editing.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Agreement updated successfully');
      } else {
        await api.post('/agreements', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Agreement uploaded successfully');
      }
      setShowForm(false);
      loadAgreements();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = async (agreement) => {
    try {
      const res = await api.get(`/agreements/download/${agreement.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', agreement.templateName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download document');
    }
  };

  const handleSubmitAgreement = async (agreementId) => {
    if (!submitFile) return toast.error('Please select a PDF file');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', submitFile);
      await api.post(`/agreements/${agreementId}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Agreement submitted successfully');
      setShowSubmit(null);
      setSubmitFile(null);
      loadAgreements();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSubmission = async (submission) => {
    try {
      const res = await api.get(`/agreements/submission/${submission.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', submission.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download submission');
    }
  };

  const viewSubmissions = async (agreement) => {
    try {
      const res = await api.get(`/agreements/${agreement.id}/submissions`);
      setSubmissions(res.data);
      setShowSubmissions(agreement);
    } catch {
      toast.error('Failed to load submissions');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this agreement and all employee submissions?')) return;
    try {
      await api.delete(`/agreements/${id}`);
      toast.success('Agreement deleted');
      loadAgreements();
    } catch {
      toast.error('Failed to delete agreement');
    }
  };

  const filtered = agreements.filter(a => {
    return !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.description?.toLowerCase().includes(search.toLowerCase());
  });

  const submittedCount = agreements.filter(a => a.mySubmission).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>NDA & Agreements</h1>
            <p>Employment agreements, NDAs, and other legal documents</p>
          </div>
          {isAdmin && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-white/90 transition shadow-lg">
              <Plus size={16} /> Upload Agreement
            </button>
          )}
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <FileSignature size={100} className="text-white" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{agreements.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Agreements</p>
        </div>
        {!isAdmin && (
          <>
            <div className="card text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{submittedCount}</p>
              <p className="text-xs text-gray-500 mt-1">Submitted</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{agreements.length - submittedCount}</p>
              <p className="text-xs text-gray-500 mt-1">Pending</p>
            </div>
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agreements..." className="input pl-9" />
      </div>

      {/* Agreements List */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FileText size={64} />
            <p className="text-lg font-medium mt-2">No agreements found</p>
            <p className="text-sm">{isAdmin ? 'Upload NDA or employment agreement templates' : 'No agreements have been uploaded yet'}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((agreement, i) => (
            <div key={agreement.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Icon & Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                    <FileSignature size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{agreement.title}</h3>
                    {agreement.description && <p className="text-xs text-gray-400 mt-0.5">{agreement.description}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-gray-400">Template: {agreement.templateName}</span>
                      <span className="text-xs text-gray-400">{formatSize(agreement.templateSize)}</span>
                      <span className="text-xs text-gray-400">
                        Uploaded {agreement.createdAt ? new Date(agreement.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Employee submission status */}
                  {!isAdmin && (
                    agreement.mySubmission ? (
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium">
                        <CheckCircle size={14} /> Submitted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium">
                        <Clock size={14} /> Pending
                      </span>
                    )
                  )}

                  {/* Download template */}
                  <button onClick={() => handleDownloadTemplate(agreement)} className="flex items-center gap-1 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-xs font-medium transition" title="Download Template">
                    <Download size={14} /> Download
                  </button>

                  {/* Employee: upload signed copy */}
                  {!isAdmin && (
                    <button onClick={() => { setShowSubmit(agreement); setSubmitFile(null); }} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-medium transition">
                      <Upload size={14} /> {agreement.mySubmission ? 'Re-upload' : 'Upload Signed'}
                    </button>
                  )}

                  {/* Admin: view submissions */}
                  {isAdmin && (
                    <>
                      <button onClick={() => viewSubmissions(agreement)} className="flex items-center gap-1 px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg text-xs font-medium transition" title="View Submissions">
                        <Users size={14} /> Submissions
                      </button>
                      <button onClick={() => openEdit(agreement)} className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded transition" title="Edit">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDelete(agreement.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Show own submission info */}
              {!isAdmin && agreement.mySubmission && (
                <div className="mt-3 pt-3 border-t dark:border-gray-700 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    Your submission: <span className="text-gray-600 dark:text-gray-300 font-medium">{agreement.mySubmission.fileName}</span>
                    {' '} - {new Date(agreement.mySubmission.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <button onClick={() => handleDownloadSubmission(agreement.mySubmission)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                    <Eye size={13} /> View My Submission
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin: Upload/Edit Agreement Panel */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">{editing ? 'Edit Agreement' : 'Upload New Agreement'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input mt-1" placeholder="e.g. Non-Disclosure Agreement" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="input mt-1" placeholder="Brief description of this agreement..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{editing ? 'Replace Template (optional)' : 'Word Document Template *'}</label>
                <div className="mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition cursor-pointer"
                  onClick={() => document.getElementById('agreement-file-input').click()}>
                  <input id="agreement-file-input" type="file" className="hidden" accept=".doc,.docx,.pdf,.odt" onChange={e => setSelectedFile(e.target.files[0])} />
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{selectedFile.name}</p>
                      <p className="text-xs text-gray-400">{formatSize(selectedFile.size)}</p>
                    </div>
                  ) : editing ? (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Click to replace template</p>
                      <p className="text-xs text-gray-400 mt-1">Current: {editing.templateName}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload Word document</p>
                      <p className="text-xs text-gray-400 mt-1">.doc, .docx, .pdf, .odt up to 20MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editing ? 'Update Agreement' : 'Upload Agreement'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Employee: Submit Signed Agreement Panel */}
      {showSubmit && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowSubmit(null)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Submit Signed Agreement</h2>
              <button onClick={() => setShowSubmit(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">{showSubmit.title}</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{showSubmit.description}</p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">Instructions:</p>
                <ol className="text-xs text-amber-700 dark:text-amber-400 mt-1 list-decimal list-inside space-y-1">
                  <li>Download the template using the "Download" button</li>
                  <li>Open the Word document and fill in your details</li>
                  <li>Save/export as PDF</li>
                  <li>Upload the signed PDF below</li>
                </ol>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Upload Signed PDF *</label>
                <div className="mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition cursor-pointer"
                  onClick={() => document.getElementById('submit-file-input').click()}>
                  <input id="submit-file-input" type="file" className="hidden" accept=".pdf" onChange={e => setSubmitFile(e.target.files[0])} />
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  {submitFile ? (
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{submitFile.name}</p>
                      <p className="text-xs text-gray-400">{formatSize(submitFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Click to select your signed PDF</p>
                      <p className="text-xs text-gray-400 mt-1">Only PDF files are accepted</p>
                    </div>
                  )}
                </div>
              </div>

              {showSubmit.mySubmission && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500">Previous submission: <span className="font-medium text-gray-700 dark:text-gray-300">{showSubmit.mySubmission.fileName}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">Uploading a new file will replace your previous submission.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowSubmit(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleSubmitAgreement(showSubmit.id)} className="btn-primary" disabled={!submitFile || submitting}>
                {submitting ? 'Submitting...' : 'Submit Agreement'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Admin: View Submissions Panel */}
      {showSubmissions && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowSubmissions(null)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold dark:text-white">Employee Submissions</h2>
                <p className="text-xs text-gray-400 mt-0.5">{showSubmissions.title}</p>
              </div>
              <button onClick={() => setShowSubmissions(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5">
              {submissions.length === 0 ? (
                <div className="text-center py-10">
                  <Users size={48} className="mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 mt-2">No submissions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{s.employeeName}</p>
                        <p className="text-xs text-gray-400">{s.empCode} - {s.department}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.fileName} - {new Date(s.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <button onClick={() => handleDownloadSubmission(s)} className="flex items-center gap-1 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-xs font-medium transition">
                        <Download size={14} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
