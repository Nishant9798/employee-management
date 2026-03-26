import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { LogOut, Send, Check, X, Clock, AlertTriangle, CheckCircle2, Package, MessageSquare, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExitManagement() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState(isAdmin ? 'requests' : 'my');
  const [myExit, setMyExit] = useState(null);
  const [allExits, setAllExits] = useState([]);
  const [showResignForm, setShowResignForm] = useState(false);
  const [resignForm, setResignForm] = useState({ resignationDate: '', lastWorkingDate: '', reason: '' });
  const [selectedExit, setSelectedExit] = useState(null);
  const [checklistForm, setChecklistForm] = useState({ exitInterview: false, assetsReturned: false, notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    api.get('/exit/my').then(r => setMyExit(r.data)).catch(() => setMyExit(null));
    if (isAdmin) {
      api.get('/exit/all').then(r => setAllExits(r.data)).catch(() => setAllExits([]));
    }
  };

  const handleSubmitResignation = async () => {
    try {
      await api.post('/exit/resign', resignForm);
      toast.success('Resignation submitted successfully');
      setShowResignForm(false);
      setResignForm({ resignationDate: '', lastWorkingDate: '', reason: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    }
  };

  const handleAction = async (id, status) => {
    try {
      const endpoint = status === 'completed' ? `/exit/complete/${id}` : `/exit/action/${id}`;
      await api.put(endpoint, { status });
      toast.success(status === 'approved' ? 'Exit request approved' : status === 'rejected' ? 'Exit request rejected' : 'Exit completed');
      setSelectedExit(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleUpdateChecklist = async (id) => {
    try {
      await api.put(`/exit/checklist/${id}`, {
        exitInterviewDone: checklistForm.exitInterview,
        exitInterviewNotes: checklistForm.notes,
        assetsReturned: checklistForm.assetsReturned,
        assetsNotes: checklistForm.notes,
      });
      toast.success('Checklist updated');
      loadData();
      // Refresh selected exit
      const updated = allExits.find(e => e.id === id);
      if (updated) setSelectedExit({ ...updated, ...checklistForm });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const openExitDetail = (exit) => {
    setSelectedExit(exit);
    setChecklistForm({
      exitInterview: exit.exitInterviewDone === 1 || false,
      assetsReturned: exit.assetsReturned === 1 || false,
      notes: exit.exitInterviewNotes || '',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock size={12} /> Pending</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Check size={12} /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><X size={12} /> Rejected</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 size={12} /> Completed</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  const tabs = [
    ...(!isAdmin ? [{ id: 'my', label: 'My Exit Status' }] : []),
    ...(isAdmin ? [
      { id: 'requests', label: `Exit Requests${allExits.filter(e => e.status === 'pending').length ? ` (${allExits.filter(e => e.status === 'pending').length})` : ''}` },
      { id: 'all', label: 'All Exits' },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Exit Management</h1>
            <p>{isAdmin ? 'Manage employee resignations and exit process' : 'Submit and track your resignation'}</p>
          </div>
          {!isAdmin && !myExit && (
            <button onClick={() => setShowResignForm(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-white/90 transition shadow-lg">
              <Send size={16} /> Submit Resignation
            </button>
          )}
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <LogOut size={100} className="text-white" />
        </div>
      </div>

      {/* Status Flow */}
      <div className="card bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="font-medium text-indigo-700 dark:text-indigo-400">Exit Flow:</span>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 flex-wrap">
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-medium text-amber-700 dark:text-amber-400">Pending</span>
            <span className="text-gray-400">&#8594;</span>
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs font-medium text-blue-700 dark:text-blue-400">Approved</span>
            <span className="text-gray-400">&#8594;</span>
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-xs font-medium text-emerald-700 dark:text-emerald-400">Completed (Employee Deactivated)</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Employee: My Exit Status */}
      {tab === 'my' && !isAdmin && (
        <div>
          {myExit ? (
            <div className="card max-w-lg animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <LogOut size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Resignation Status</h3>
                  {getStatusBadge(myExit.status)}
                </div>
              </div>
              <div className="space-y-3 mt-4">
                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Resignation Date</span>
                  <span className="text-sm font-medium dark:text-white">{myExit.resignationDate}</span>
                </div>
                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Last Working Date</span>
                  <span className="text-sm font-medium dark:text-white">{myExit.lastWorkingDate}</span>
                </div>
                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Reason</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 text-right max-w-[200px]">{myExit.reason}</span>
                </div>
                {myExit.notes && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Admin Notes</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{myExit.notes}</p>
                  </div>
                )}
              </div>
              {myExit.status === 'approved' && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    <AlertTriangle size={12} className="inline mr-1" />
                    Your resignation has been approved. Please complete the exit formalities before your last working date.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <LogOut size={64} />
                <p className="text-lg font-medium mt-2">No resignation submitted</p>
                <p className="text-sm">Click "Submit Resignation" to start the exit process</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin: Exit Requests (Pending) */}
      {tab === 'requests' && isAdmin && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Resignation Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Last Working Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {allExits.filter(e => e.status === 'pending').map(exit => (
                <tr key={exit.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium dark:text-white">{exit.employeeName}</p>
                    <p className="text-xs text-gray-400">{exit.department}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{exit.resignationDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{exit.lastWorkingDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate hidden sm:table-cell">{exit.reason}</td>
                  <td className="px-4 py-3">{getStatusBadge(exit.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleAction(exit.id, 'approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition" title="Approve">
                        <Check size={16} />
                      </button>
                      <button onClick={() => handleAction(exit.id, 'rejected')} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Reject">
                        <X size={16} />
                      </button>
                      <button onClick={() => openExitDetail(exit)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition" title="Details">
                        <MessageSquare size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {allExits.filter(e => e.status === 'pending').length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No pending exit requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin: All Exits */}
      {tab === 'all' && isAdmin && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Resignation Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Last Working Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {allExits.map(exit => (
                <tr key={exit.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium dark:text-white">{exit.employeeName}</p>
                    <p className="text-xs text-gray-400">{exit.department}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{exit.resignationDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{exit.lastWorkingDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate hidden sm:table-cell">{exit.reason}</td>
                  <td className="px-4 py-3">{getStatusBadge(exit.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openExitDetail(exit)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition" title="Details & Checklist">
                        <MessageSquare size={16} />
                      </button>
                      {exit.status === 'approved' && (
                        <button onClick={() => handleAction(exit.id, 'completed')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition" title="Complete Exit">
                          <UserX size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {allExits.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No exit requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Resignation Form Slide Panel */}
      {showResignForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowResignForm(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Submit Resignation</h2>
              <button onClick={() => setShowResignForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle size={12} className="inline mr-1" />
                  This action will submit your resignation to HR for review. Please ensure all details are correct.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Resignation Date</label>
                <input type="date" value={resignForm.resignationDate} onChange={e => setResignForm({...resignForm, resignationDate: e.target.value})} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Last Working Date</label>
                <input type="date" value={resignForm.lastWorkingDate} onChange={e => setResignForm({...resignForm, lastWorkingDate: e.target.value})} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Reason for Resignation</label>
                <textarea value={resignForm.reason} onChange={e => setResignForm({...resignForm, reason: e.target.value})} rows={4} className="input mt-1" placeholder="Please share your reason for leaving..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setShowResignForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmitResignation} className="btn-danger" disabled={!resignForm.resignationDate || !resignForm.lastWorkingDate || !resignForm.reason}>
                Submit Resignation
              </button>
            </div>
          </div>
        </>
      )}

      {/* Exit Detail / Checklist Slide Panel */}
      {selectedExit && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedExit(null)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Exit Details</h2>
              <button onClick={() => setSelectedExit(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-130px)]">
              {/* Employee Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                  {selectedExit.employeeName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold dark:text-white">{selectedExit.employeeName}</p>
                  <p className="text-xs text-gray-400">{selectedExit.department}</p>
                </div>
                <div className="ml-auto">{getStatusBadge(selectedExit.status)}</div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Resignation Date</span>
                  <span className="text-sm font-medium dark:text-white">{selectedExit.resignationDate}</span>
                </div>
                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Last Working Date</span>
                  <span className="text-sm font-medium dark:text-white">{selectedExit.lastWorkingDate}</span>
                </div>
                <div className="py-2 border-b dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Reason</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedExit.reason}</p>
                </div>
              </div>

              {/* Exit Checklist */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Exit Checklist</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <input type="checkbox" checked={checklistForm.exitInterview} onChange={e => setChecklistForm({...checklistForm, exitInterview: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-indigo-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Exit Interview Conducted</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <input type="checkbox" checked={checklistForm.assetsReturned} onChange={e => setChecklistForm({...checklistForm, assetsReturned: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-emerald-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Company Assets Returned</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Admin Notes</label>
                <textarea value={checklistForm.notes} onChange={e => setChecklistForm({...checklistForm, notes: e.target.value})} rows={3} className="input mt-1" placeholder="Add notes about the exit process..." />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button onClick={() => handleUpdateChecklist(selectedExit.id)} className="btn-primary w-full">
                  Save Checklist
                </button>
                {selectedExit.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(selectedExit.id, 'approved')} className="btn-success flex-1">
                      <Check size={16} className="inline mr-1" /> Approve
                    </button>
                    <button onClick={() => handleAction(selectedExit.id, 'rejected')} className="btn-danger flex-1">
                      <X size={16} className="inline mr-1" /> Reject
                    </button>
                  </div>
                )}
                {selectedExit.status === 'approved' && (
                  <button onClick={() => handleAction(selectedExit.id, 'completed')} className="btn-danger w-full">
                    <UserX size={16} className="inline mr-1" /> Complete Exit & Deactivate Employee
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
