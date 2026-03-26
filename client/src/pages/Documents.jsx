import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { FileText, Upload, Download, Trash2, X, FolderOpen, File, FileImage, FileSpreadsheet, FilePlus, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Identity', 'Education', 'Experience', 'Policy', 'Contract', 'Certificate', 'Other'];

const categoryColors = {
  Identity: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Education: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Experience: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Policy: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Contract: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Certificate: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  Other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const fileIcon = (name) => {
  if (!name) return <File size={24} />;
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return <FileImage size={24} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={24} />;
  return <FileText size={24} />;
};

const formatSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export default function Documents() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState('my');
  const [myDocs, setMyDocs] = useState([]);
  const [companyDocs, setCompanyDocs] = useState([]);
  const [employeeDocs, setEmployeeDocs] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [uploadForm, setUploadForm] = useState({ category: '', description: '', isCompanyDoc: false });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    api.get('/documents/my').then(r => setMyDocs(r.data)).catch(() => setMyDocs([]));
    api.get('/documents/company').then(r => setCompanyDocs(r.data)).catch(() => setCompanyDocs([]));
    if (isAdmin) {
      api.get('/documents/all').then(r => setEmployeeDocs(r.data)).catch(() => setEmployeeDocs([]));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.category) {
      toast.error('Please select a file and category');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', uploadForm.category);
      formData.append('description', uploadForm.description);
      formData.append('isCompanyDoc', uploadForm.isCompanyDoc);
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded successfully');
      setShowUpload(false);
      setSelectedFile(null);
      setUploadForm({ category: '', description: '', isCompanyDoc: false });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc) => {
    window.open(`/api/documents/download/${doc.id}`, '_blank');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const filterDocs = (docs) => {
    return docs.filter(d => {
      const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.originalName?.toLowerCase().includes(search.toLowerCase());
      const matchCat = !catFilter || d.category === catFilter;
      return matchSearch && matchCat;
    });
  };

  const tabs = [
    { id: 'my', label: 'My Documents' },
    { id: 'company', label: 'Company Documents' },
    ...(isAdmin ? [{ id: 'employee', label: 'Employee Documents' }] : []),
  ];

  const renderDocGrid = (docs, canDelete = false) => {
    const filtered = filterDocs(docs);
    if (filtered.length === 0) {
      return (
        <div className="card">
          <div className="empty-state">
            <FolderOpen size={64} />
            <p className="text-lg font-medium mt-2">No documents found</p>
            <p className="text-sm">Upload documents to get started</p>
          </div>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc, i) => (
          <div key={doc.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                {fileIcon(doc.originalName || doc.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white truncate">{doc.originalName || doc.name}</h3>
                {doc.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`badge ${categoryColors[doc.category] || categoryColors.Other}`}>{doc.category}</span>
                  <span className="text-xs text-gray-400">{formatSize(doc.size)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t dark:border-gray-700">
              <div className="text-xs text-gray-400">
                {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                {doc.employeeName && <span className="ml-1">by {doc.employeeName}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleDownload(doc)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition" title="Download">
                  <Download size={15} />
                </button>
                {canDelete && (
                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Delete">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Documents</h1>
            <p>Manage and organize your documents</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-white/90 transition shadow-lg">
            <Upload size={16} /> Upload Document
          </button>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <FileText size={100} className="text-white" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="input pl-9" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input w-auto">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Document Grids */}
      {tab === 'my' && renderDocGrid(myDocs, true)}
      {tab === 'company' && renderDocGrid(companyDocs, isAdmin)}
      {tab === 'employee' && isAdmin && renderDocGrid(employeeDocs, true)}

      {/* Upload Slide Panel */}
      {showUpload && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowUpload(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Upload Document</h2>
              <button onClick={() => setShowUpload(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">File</label>
                <div className="mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition cursor-pointer"
                  onClick={() => document.getElementById('file-input').click()}>
                  <input id="file-input" type="file" className="hidden" onChange={e => setSelectedFile(e.target.files[0])} />
                  <FilePlus size={32} className="mx-auto text-gray-400 mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{selectedFile.name}</p>
                      <p className="text-xs text-gray-400">{formatSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Click to select a file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOC, XLS, JPG, PNG up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
                <select value={uploadForm.category} onChange={e => setUploadForm({...uploadForm, category: e.target.value})} className="input mt-1">
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description (optional)</label>
                <textarea value={uploadForm.description} onChange={e => setUploadForm({...uploadForm, description: e.target.value})} rows={3} className="input mt-1" placeholder="Brief description of this document..." />
              </div>
              {isAdmin && (
                <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <input type="checkbox" id="company-doc" checked={uploadForm.isCompanyDoc} onChange={e => setUploadForm({...uploadForm, isCompanyDoc: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                  <label htmlFor="company-doc" className="text-sm text-gray-700 dark:text-gray-300">Upload as company-wide document</label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowUpload(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleUpload} className="btn-primary" disabled={!selectedFile || !uploadForm.category || uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
