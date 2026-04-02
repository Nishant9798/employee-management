import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Package, Plus, Search, Filter, X, Edit2, Trash2, UserPlus, RotateCcw,
  Monitor, Code, Armchair, Car, Headphones, MoreHorizontal,
  DollarSign, CheckCircle, AlertTriangle, Archive, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Hardware', 'Software', 'Furniture', 'Vehicle', 'Accessory', 'Other'];
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];

const categoryColors = {
  Hardware: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Software: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Furniture: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Vehicle: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Accessory: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  Other: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

const statusColors = {
  Available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Retired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const categoryIcon = (category) => {
  switch (category) {
    case 'Hardware': return <Monitor size={20} />;
    case 'Software': return <Code size={20} />;
    case 'Furniture': return <Armchair size={20} />;
    case 'Vehicle': return <Car size={20} />;
    case 'Accessory': return <Headphones size={20} />;
    default: return <MoreHorizontal size={20} />;
  }
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const emptyForm = {
  assetId: '',
  name: '',
  category: '',
  serialNumber: '',
  purchaseDate: '',
  purchaseCost: '',
  condition: 'New',
  notes: '',
};

export default function AssetManagement() {
  const { user, isAdmin } = useAuth();
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const assetsRes = await api.get('/assets');
      setAssets(assetsRes.data.assets || assetsRes.data || []);
      if (assetsRes.data.employees) {
        setEmployees(assetsRes.data.employees);
      }
      if (isAdmin) {
        api.get('/assets/stats').then(r => setStats(r.data)).catch(() => setStats(null));
      }
    } catch (err) {
      toast.error('Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingAsset(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEditForm = (asset) => {
    setEditingAsset(asset);
    setForm({
      assetId: asset.assetId || '',
      name: asset.name || '',
      category: asset.category || '',
      serialNumber: asset.serialNumber || '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      purchaseCost: asset.purchaseCost || '',
      condition: asset.condition || 'Good',
      notes: asset.notes || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAsset(null);
    setForm({ ...emptyForm });
  };

  const openAssign = (asset) => {
    setSelectedAsset(asset);
    setAssignEmployeeId('');
    setShowAssign(true);
  };

  const closeAssign = () => {
    setShowAssign(false);
    setSelectedAsset(null);
    setAssignEmployeeId('');
  };

  const openReturn = (asset) => {
    setSelectedAsset(asset);
    setReturnCondition('Good');
    setShowReturn(true);
  };

  const closeReturn = () => {
    setShowReturn(false);
    setSelectedAsset(null);
    setReturnCondition('Good');
  };

  const handleSubmit = async () => {
    if (!form.assetId || !form.name || !form.category) {
      toast.error('Please fill in Asset ID, Name, and Category');
      return;
    }
    setSubmitting(true);
    try {
      if (editingAsset) {
        await api.put(`/assets/${editingAsset._id || editingAsset.id}`, form);
        toast.success('Asset updated successfully');
      } else {
        await api.post('/assets', form);
        toast.success('Asset created successfully');
      }
      closeForm();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/assets/${selectedAsset._id || selectedAsset.id}/assign`, { employeeId: assignEmployeeId });
      toast.success('Asset assigned successfully');
      closeAssign();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    setSubmitting(true);
    try {
      await api.put(`/assets/${selectedAsset._id || selectedAsset.id}/return`, { condition: returnCondition });
      toast.success('Asset returned successfully');
      closeReturn();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to return asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (asset) => {
    if (!confirm('Are you sure you want to retire this asset?')) return;
    try {
      await api.delete(`/assets/${asset._id || asset.id}`);
      toast.success('Asset retired successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to retire asset');
    }
  };

  const filteredAssets = assets.filter(a => {
    const matchSearch = !search ||
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.assetId?.toLowerCase().includes(search.toLowerCase()) ||
      a.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
      a.assignedTo?.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || a.category === catFilter;
    return matchSearch && matchCat;
  });

  // Employee view
  if (!isAdmin) {
    const myAssets = assets.filter(a =>
      a.assignedTo?.id === user?.id ||
      a.assignedTo?._id === user?.id ||
      a.assignedTo === user?.id ||
      a.employeeId === user?.id
    );

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="page-header">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1>My Assets</h1>
              <p>Assets assigned to you</p>
            </div>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
            <Package size={100} className="text-white" />
          </div>
        </div>

        {/* Assets Grid */}
        {myAssets.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Package size={64} />
              <p className="text-lg font-medium mt-2">No assets assigned</p>
              <p className="text-sm">You don't have any assets assigned to you currently</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myAssets.map((asset, i) => (
              <div key={asset._id || asset.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    {categoryIcon(asset.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white truncate">{asset.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">ID: {asset.assetId}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`badge ${categoryColors[asset.category] || categoryColors.Other}`}>{asset.category}</span>
                      <span className={`badge ${statusColors[asset.condition] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>{asset.condition}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t dark:border-slate-700">
                  <div className="text-xs text-slate-400">
                    Assigned: {asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Admin view
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Asset Management</h1>
            <p>Track and manage company assets</p>
          </div>
          <button onClick={openCreateForm} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-medium hover:bg-white/90 transition shadow-lg">
            <Plus size={16} /> Add Asset
          </button>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Package size={100} className="text-white" />
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card animate-slide-up" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Package size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Assets</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.total || 0}</p>
              </div>
            </div>
          </div>
          <div className="card animate-slide-up" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <UserPlus size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Assigned</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.assigned || 0}</p>
              </div>
            </div>
          </div>
          <div className="card animate-slide-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Available</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.available || 0}</p>
              </div>
            </div>
          </div>
          <div className="card animate-slide-up" style={{ animationDelay: '180ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Maintenance</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.maintenance || 0}</p>
              </div>
            </div>
          </div>
          <div className="card animate-slide-up" style={{ animationDelay: '240ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Value</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets by name, ID, serial number..." className="input pl-9" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input w-auto">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Assets Table */}
      {filteredAssets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Package size={64} />
            <p className="text-lg font-medium mt-2">No assets found</p>
            <p className="text-sm">{assets.length === 0 ? 'Add your first asset to get started' : 'Try adjusting your search or filter'}</p>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Asset</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Serial Number</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Condition</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {filteredAssets.map((asset, i) => (
                  <tr key={asset._id || asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                          {categoryIcon(asset.category)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">{asset.name}</p>
                          <p className="text-xs text-slate-400">{asset.assetId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${categoryColors[asset.category] || categoryColors.Other}`}>{asset.category}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{asset.serialNumber || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusColors[asset.status] || statusColors.Available}`}>{asset.status || 'Available'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {asset.assignedTo?.name || asset.assignedToName || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{asset.condition || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(asset.purchaseCost)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {(!asset.status || asset.status === 'Available') && (
                          <button onClick={() => openAssign(asset)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition" title="Assign to employee">
                            <UserPlus size={15} />
                          </button>
                        )}
                        {asset.status === 'Assigned' && (
                          <button onClick={() => openReturn(asset)} className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded transition" title="Return asset">
                            <RotateCcw size={15} />
                          </button>
                        )}
                        <button onClick={() => openEditForm(asset)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition" title="Edit">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(asset)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Retire">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Asset Slide Panel */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-slate-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold dark:text-white">{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h2>
              <button onClick={closeForm}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Asset ID <span className="text-red-500">*</span></label>
                <input
                  value={form.assetId}
                  onChange={e => setForm({ ...form, assetId: e.target.value })}
                  className="input mt-1"
                  placeholder="e.g. AST-001"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input mt-1"
                  placeholder="e.g. MacBook Pro 14-inch"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Category <span className="text-red-500">*</span></label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="input mt-1"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Serial Number</label>
                <input
                  value={form.serialNumber}
                  onChange={e => setForm({ ...form, serialNumber: e.target.value })}
                  className="input mt-1"
                  placeholder="e.g. SN-12345678"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Purchase Date</label>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Purchase Cost</label>
                <input
                  type="number"
                  value={form.purchaseCost}
                  onChange={e => setForm({ ...form, purchaseCost: e.target.value })}
                  className="input mt-1"
                  placeholder="e.g. 150000"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Condition</label>
                <select
                  value={form.condition}
                  onChange={e => setForm({ ...form, condition: e.target.value })}
                  className="input mt-1"
                >
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="input mt-1"
                  placeholder="Additional notes about this asset..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
              <button onClick={closeForm} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmit} className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingAsset ? 'Update Asset' : 'Create Asset'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Assign Asset Slide Panel */}
      {showAssign && selectedAsset && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={closeAssign} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-slate-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold dark:text-white">Assign Asset</h2>
              <button onClick={closeAssign}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    {categoryIcon(selectedAsset.category)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">{selectedAsset.name}</p>
                    <p className="text-xs text-slate-400">{selectedAsset.assetId} | {selectedAsset.category}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Assign to Employee <span className="text-red-500">*</span></label>
                <select
                  value={assignEmployeeId}
                  onChange={e => setAssignEmployeeId(e.target.value)}
                  className="input mt-1"
                >
                  <option value="">Select employee</option>
                  {employees.map(emp => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name} {emp.employeeId ? `(${emp.employeeId})` : ''} {emp.department ? `- ${emp.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
              <button onClick={closeAssign} className="btn-secondary">Cancel</button>
              <button onClick={handleAssign} className="btn-primary" disabled={!assignEmployeeId || submitting}>
                {submitting ? 'Assigning...' : 'Assign Asset'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Return Asset Slide Panel */}
      {showReturn && selectedAsset && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={closeReturn} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-slate-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold dark:text-white">Return Asset</h2>
              <button onClick={closeReturn}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    {categoryIcon(selectedAsset.category)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">{selectedAsset.name}</p>
                    <p className="text-xs text-slate-400">{selectedAsset.assetId} | Currently assigned to {selectedAsset.assignedTo?.name || selectedAsset.assignedToName || 'employee'}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Condition on Return <span className="text-red-500">*</span></label>
                <select
                  value={returnCondition}
                  onChange={e => setReturnCondition(e.target.value)}
                  className="input mt-1"
                >
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">This will unassign the asset from the current employee and mark it as available.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
              <button onClick={closeReturn} className="btn-secondary">Cancel</button>
              <button onClick={handleReturn} className="btn-primary" disabled={submitting}>
                {submitting ? 'Returning...' : 'Return Asset'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
