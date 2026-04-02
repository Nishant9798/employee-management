import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, ChevronRight, Check, Circle, Clock, ArrowLeft, MessageSquare, User, X } from 'lucide-react';
import toast from 'react-hot-toast';

const categoryColors = {
  documentation: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
  it: { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', dot: 'bg-purple-500' },
  team: { bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  hr: { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  training: { bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
};

const statusIcons = {
  pending: <Circle size={18} className="text-slate-400" />,
  in_progress: <Clock size={18} className="text-amber-500" />,
  completed: <Check size={18} className="text-emerald-500" />,
};

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function Onboarding() {
  const { user, isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setLoading(true);
    if (isAdmin) {
      api.get('/onboarding/all').then(r => setEmployees(r.data)).catch(() => setEmployees([]));
    }
    api.get(`/onboarding/progress/${user.id}`).then(r => setMyTasks(r.data)).catch(() => setMyTasks([]));
    setLoading(false);
  };

  const loadEmployeeTasks = (empId) => {
    api.get(`/onboarding/progress/${empId}`).then(r => {
      setTasks(r.data);
      const emp = employees.find(e => e.id === empId);
      setSelectedEmployee(emp || { id: empId });
    }).catch(() => setTasks([]));
  };

  const handleUpdateStatus = async (taskId, status, empId) => {
    try {
      await api.put(`/onboarding/progress/${empId || user.id}/${taskId}`, { status });
      toast.success(`Task marked as ${statusLabels[status].toLowerCase()}`);
      if (empId) loadEmployeeTasks(empId);
      else {
        api.get(`/onboarding/progress/${user.id}`).then(r => setMyTasks(r.data));
      }
      if (isAdmin) api.get('/onboarding/all').then(r => setEmployees(r.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const handleAddNote = async () => {
    if (!showNoteModal || !note.trim()) return;
    try {
      await api.put(`/onboarding/progress/${selectedEmployee?.id || user.id}/${showNoteModal.taskId}`, { notes: note });
      toast.success('Note added');
      setShowNoteModal(null);
      setNote('');
      if (selectedEmployee) loadEmployeeTasks(selectedEmployee.id);
      else api.get(`/onboarding/progress/${user.id}`).then(r => setMyTasks(r.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const getProgress = (taskList) => {
    if (!taskList || taskList.length === 0) return 0;
    const completed = taskList.filter(t => t.progressStatus === 'completed').length;
    return Math.round((completed / taskList.length) * 100);
  };

  const getCatColor = (cat) => {
    return categoryColors[cat?.toLowerCase()] || categoryColors.hr;
  };

  const renderProgressBar = (percent) => (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Progress</span>
        <span className={`text-xs font-bold ${percent === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{percent}%</span>
      </div>
      <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
          style={{ width: `${percent}%` }} />
      </div>
    </div>
  );

  const renderTaskList = (taskList, empId = null) => (
    <div className="space-y-3">
      {taskList.map((task, i) => (
        <div key={task.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="flex items-start gap-3">
            <button
              onClick={() => {
                const nextStatus = task.progressStatus === 'pending' ? 'in_progress' : task.progressStatus === 'in_progress' ? 'completed' : 'pending';
                handleUpdateStatus(task.id, nextStatus, empId);
              }}
              className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
              title={`Click to change status`}
            >
              {statusIcons[task.progressStatus]}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`text-sm font-semibold ${task.progressStatus === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>
                  {task.title}
                </h4>
                <span className={`badge ${getCatColor(task.category).bg}`}>{task.category}</span>
              </div>
              {task.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{task.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2">
                {task.assignTo && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <User size={12} /> {task.assignTo}
                  </span>
                )}
                <span className={`text-xs font-medium ${task.progressStatus === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : task.progressStatus === 'in_progress' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                  {statusLabels[task.progressStatus]}
                </span>
              </div>
              {task.notes && (
                <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{task.notes}</p>
                </div>
              )}
            </div>
            {isAdmin && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setShowNoteModal({ taskId: task.id }); setNote(task.notes || ''); }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition" title="Add note">
                  <MessageSquare size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      {taskList.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <ClipboardList size={64} />
            <p className="text-lg font-medium mt-2">No onboarding tasks</p>
          </div>
        </div>
      )}
    </div>
  );

  // Admin view: employee list or selected employee tasks
  if (isAdmin && !selectedEmployee) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="page-header">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1>Onboarding</h1>
              <p>Track employee onboarding progress</p>
            </div>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
            <ClipboardList size={100} className="text-white" />
          </div>
        </div>

        {/* Employee List */}
        <div className="space-y-4">
          {employees.map((emp, i) => {
            const progress = emp.totalTasks > 0 ? Math.round((emp.completedTasks / emp.totalTasks) * 100) : 0;
            return (
              <div key={emp.id} className="card hover:shadow-md transition-all duration-300 cursor-pointer animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => loadEmployeeTasks(emp.id)}>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm">
                    {emp.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{emp.name}</h3>
                        <p className="text-xs text-slate-400">{emp.department} - {emp.designation}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${progress === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                          {progress}%
                        </span>
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {employees.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <ClipboardList size={64} />
                <p className="text-lg font-medium mt-2">No employees with onboarding tasks</p>
              </div>
            </div>
          )}
        </div>

        {/* Note Modal */}
        {showNoteModal && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => { setShowNoteModal(null); setNote(''); }} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold dark:text-white mb-4">Add Note</h3>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} className="input" placeholder="Add a note to this task..." />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setShowNoteModal(null); setNote(''); }} className="btn-secondary">Cancel</button>
                <button onClick={handleAddNote} className="btn-primary">Save Note</button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Admin viewing specific employee tasks OR employee viewing own tasks
  const activeTasks = isAdmin && selectedEmployee ? tasks : myTasks;
  const activeProgress = getProgress(activeTasks);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Onboarding</h1>
            <p>{isAdmin && selectedEmployee ? `${selectedEmployee.name}'s onboarding checklist` : 'Your onboarding checklist'}</p>
          </div>
          {isAdmin && selectedEmployee && (
            <button onClick={() => setSelectedEmployee(null)} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition backdrop-blur-sm">
              <ArrowLeft size={16} /> Back to List
            </button>
          )}
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <ClipboardList size={100} className="text-white" />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card">
        {renderProgressBar(activeProgress)}
        <div className="flex gap-4 mt-3">
          <span className="text-xs text-slate-400">{activeTasks.filter(t => t.status === 'completed').length} of {activeTasks.length} tasks completed</span>
          {activeProgress === 100 && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">All tasks completed!</span>}
        </div>
      </div>

      {/* Category Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(categoryColors).map(([cat, colors]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
            <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{cat}</span>
          </div>
        ))}
      </div>

      {/* Task List */}
      {renderTaskList(activeTasks, selectedEmployee?.id)}

      {/* Note Modal */}
      {showNoteModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => { setShowNoteModal(null); setNote(''); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold dark:text-white mb-4">Add Note</h3>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} className="input" placeholder="Add a note to this task..." />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowNoteModal(null); setNote(''); }} className="btn-secondary">Cancel</button>
              <button onClick={handleAddNote} className="btn-primary">Save Note</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
