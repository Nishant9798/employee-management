import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Save, Clock, CalendarDays, LogOut, Building2, ChevronLeft, ChevronRight, Activity, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('general');
  const [general, setGeneral] = useState({ companyName: '', companyEmail: '', companyPhone: '', companyAddress: '', timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY' });
  const [attendance, setAttendance] = useState({ workStartTime: '09:00', workEndTime: '18:00', lateThresholdMinutes: 15, halfDayHours: 4, fullDayHours: 8, autoMarkAbsent: true, weekendDays: 'Saturday,Sunday' });
  const [leavePolicy, setLeavePolicy] = useState({ maxCarryForward: 5, minDaysNotice: 3, maxConsecutiveDays: 15, probationLeavesAllowed: false, requireManagerApproval: true, requireHrApproval: true });
  const [exitPolicy, setExitPolicy] = useState({ noticePeriodDays: 30, exitInterviewRequired: true, assetReturnRequired: true, fnfProcessingDays: 45 });
  const [activityLog, setActivityLog] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [saving, setSaving] = useState('');

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { if (tab === 'activity') loadActivityLog(); }, [tab, logPage]);

  const loadSettings = () => {
    api.get('/settings').then(r => {
      const s = r.data;
      if (s.general) setGeneral(prev => ({ ...prev, ...s.general }));
      if (s.attendance) setAttendance(prev => ({ ...prev, ...s.attendance }));
      if (s.leavePolicy) setLeavePolicy(prev => ({ ...prev, ...s.leavePolicy }));
      if (s.exitPolicy) setExitPolicy(prev => ({ ...prev, ...s.exitPolicy }));
    }).catch(() => {});
  };

  const loadActivityLog = () => {
    api.get('/settings/activity-log', { params: { page: logPage, limit: 20 } }).then(r => {
      setActivityLog(r.data.logs || r.data);
      setLogTotal(r.data.total || 0);
    }).catch(() => setActivityLog([]));
  };

  const handleSave = async (section, data) => {
    setSaving(section);
    try {
      await api.put(`/settings/${section}`, data);
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving('');
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <div className="relative z-10">
            <h1>Settings</h1>
            <p>System configuration</p>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
            <SettingsIcon size={100} className="text-white" />
          </div>
        </div>
        <div className="card">
          <div className="empty-state">
            <Shield size={64} />
            <p className="text-lg font-medium mt-2">Admin Access Required</p>
            <p className="text-sm">Only administrators can access system settings</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: <Building2 size={14} /> },
    { id: 'attendance', label: 'Attendance', icon: <Clock size={14} /> },
    { id: 'leave', label: 'Leave Policy', icon: <CalendarDays size={14} /> },
    { id: 'exit', label: 'Exit Policy', icon: <LogOut size={14} /> },
    { id: 'activity', label: 'Activity Log', icon: <Activity size={14} /> },
  ];

  const totalPages = Math.ceil(logTotal / 20);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Settings</h1>
            <p>Configure system preferences and policies</p>
          </div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <SettingsIcon size={100} className="text-white" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {tab === 'general' && (
        <div className="card animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">General Settings</h3>
              <p className="text-xs text-slate-400">Company information and preferences</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Company Name</label>
                <input value={general.companyName} onChange={e => setGeneral({...general, companyName: e.target.value})} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Company Email</label>
                <input type="email" value={general.companyEmail} onChange={e => setGeneral({...general, companyEmail: e.target.value})} className="input mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Phone</label>
                <input value={general.companyPhone} onChange={e => setGeneral({...general, companyPhone: e.target.value})} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Timezone</label>
                <select value={general.timezone} onChange={e => setGeneral({...general, timezone: e.target.value})} className="input mt-1">
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Company Address</label>
              <textarea value={general.companyAddress} onChange={e => setGeneral({...general, companyAddress: e.target.value})} rows={2} className="input mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Date Format</label>
              <select value={general.dateFormat} onChange={e => setGeneral({...general, dateFormat: e.target.value})} className="input mt-1 w-auto">
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-6 pt-4 border-t dark:border-slate-700">
            <button onClick={() => handleSave('general', general)} className="btn-primary flex items-center gap-2" disabled={saving === 'general'}>
              <Save size={16} /> {saving === 'general' ? 'Saving...' : 'Save General Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Attendance Settings */}
      {tab === 'attendance' && (
        <div className="card animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
              <Clock size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Attendance Settings</h3>
              <p className="text-xs text-slate-400">Configure work hours and attendance rules</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Work Start Time</label>
                <input type="time" value={attendance.workStartTime} onChange={e => setAttendance({...attendance, workStartTime: e.target.value})} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Work End Time</label>
                <input type="time" value={attendance.workEndTime} onChange={e => setAttendance({...attendance, workEndTime: e.target.value})} className="input mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Late Threshold (minutes)</label>
                <input type="number" value={attendance.lateThresholdMinutes} onChange={e => setAttendance({...attendance, lateThresholdMinutes: Number(e.target.value)})} className="input mt-1" min="0" />
                <p className="text-[10px] text-slate-400 mt-1">Minutes after start time to mark as late</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Half Day Hours</label>
                <input type="number" value={attendance.halfDayHours} onChange={e => setAttendance({...attendance, halfDayHours: Number(e.target.value)})} className="input mt-1" min="1" />
                <p className="text-[10px] text-slate-400 mt-1">Minimum hours for half day</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Full Day Hours</label>
                <input type="number" value={attendance.fullDayHours} onChange={e => setAttendance({...attendance, fullDayHours: Number(e.target.value)})} className="input mt-1" min="1" />
                <p className="text-[10px] text-slate-400 mt-1">Minimum hours for full day</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Weekend Days</label>
              <input value={attendance.weekendDays} onChange={e => setAttendance({...attendance, weekendDays: e.target.value})} className="input mt-1" placeholder="Saturday,Sunday" />
              <p className="text-[10px] text-slate-400 mt-1">Comma-separated weekend days</p>
            </div>
            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer">
              <input type="checkbox" checked={attendance.autoMarkAbsent} onChange={e => setAttendance({...attendance, autoMarkAbsent: e.target.checked})}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
              <div>
                <span className="text-sm text-slate-700 dark:text-slate-300">Auto-mark absent</span>
                <p className="text-[10px] text-slate-400">Automatically mark employees as absent if no check-in recorded</p>
              </div>
            </label>
          </div>
          <div className="flex justify-end mt-6 pt-4 border-t dark:border-slate-700">
            <button onClick={() => handleSave('attendance', attendance)} className="btn-primary flex items-center gap-2" disabled={saving === 'attendance'}>
              <Save size={16} /> {saving === 'attendance' ? 'Saving...' : 'Save Attendance Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Leave Policy Settings */}
      {tab === 'leave' && (
        <div className="card animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
              <CalendarDays size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Leave Policy</h3>
              <p className="text-xs text-slate-400">Configure leave rules and approval workflow</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Max Carry Forward (days)</label>
                <input type="number" value={leavePolicy.maxCarryForward} onChange={e => setLeavePolicy({...leavePolicy, maxCarryForward: Number(e.target.value)})} className="input mt-1" min="0" />
                <p className="text-[10px] text-slate-400 mt-1">Maximum leaves that can be carried to next year</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Min Notice Days</label>
                <input type="number" value={leavePolicy.minDaysNotice} onChange={e => setLeavePolicy({...leavePolicy, minDaysNotice: Number(e.target.value)})} className="input mt-1" min="0" />
                <p className="text-[10px] text-slate-400 mt-1">Minimum days before leave starts</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Max Consecutive Days</label>
                <input type="number" value={leavePolicy.maxConsecutiveDays} onChange={e => setLeavePolicy({...leavePolicy, maxConsecutiveDays: Number(e.target.value)})} className="input mt-1" min="1" />
                <p className="text-[10px] text-slate-400 mt-1">Maximum consecutive leave days allowed</p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={leavePolicy.probationLeavesAllowed} onChange={e => setLeavePolicy({...leavePolicy, probationLeavesAllowed: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">Allow leaves during probation</span>
                  <p className="text-[10px] text-slate-400">Employees on probation can apply for leaves</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={leavePolicy.requireManagerApproval} onChange={e => setLeavePolicy({...leavePolicy, requireManagerApproval: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">Require manager approval</span>
                  <p className="text-[10px] text-slate-400">Leaves must be approved by reporting manager first</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={leavePolicy.requireHrApproval} onChange={e => setLeavePolicy({...leavePolicy, requireHrApproval: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">Require HR approval</span>
                  <p className="text-[10px] text-slate-400">Final HR approval required after manager approval</p>
                </div>
              </label>
            </div>
          </div>
          <div className="flex justify-end mt-6 pt-4 border-t dark:border-slate-700">
            <button onClick={() => handleSave('leave', leavePolicy)} className="btn-primary flex items-center gap-2" disabled={saving === 'leave'}>
              <Save size={16} /> {saving === 'leave' ? 'Saving...' : 'Save Leave Policy'}
            </button>
          </div>
        </div>
      )}

      {/* Exit Policy Settings */}
      {tab === 'exit' && (
        <div className="card animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-sm">
              <LogOut size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Exit Policy</h3>
              <p className="text-xs text-slate-400">Configure resignation and exit process rules</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notice Period (days)</label>
                <input type="number" value={exitPolicy.noticePeriodDays} onChange={e => setExitPolicy({...exitPolicy, noticePeriodDays: Number(e.target.value)})} className="input mt-1" min="0" />
                <p className="text-[10px] text-slate-400 mt-1">Required notice period before last working date</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">F&F Processing Days</label>
                <input type="number" value={exitPolicy.fnfProcessingDays} onChange={e => setExitPolicy({...exitPolicy, fnfProcessingDays: Number(e.target.value)})} className="input mt-1" min="0" />
                <p className="text-[10px] text-slate-400 mt-1">Days to process full & final settlement</p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={exitPolicy.exitInterviewRequired} onChange={e => setExitPolicy({...exitPolicy, exitInterviewRequired: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">Exit interview required</span>
                  <p className="text-[10px] text-slate-400">Mandate exit interview before completing the exit process</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={exitPolicy.assetReturnRequired} onChange={e => setExitPolicy({...exitPolicy, assetReturnRequired: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">Asset return required</span>
                  <p className="text-[10px] text-slate-400">All company assets must be returned before exit completion</p>
                </div>
              </label>
            </div>
          </div>
          <div className="flex justify-end mt-6 pt-4 border-t dark:border-slate-700">
            <button onClick={() => handleSave('exit', exitPolicy)} className="btn-primary flex items-center gap-2" disabled={saving === 'exit'}>
              <Save size={16} /> {saving === 'exit' ? 'Saving...' : 'Save Exit Policy'}
            </button>
          </div>
        </div>
      )}

      {/* Activity Log */}
      {tab === 'activity' && (
        <div className="space-y-4">
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">User</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Action</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">Target</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Details</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {activityLog.map((log, i) => (
                  <tr key={log.id || i} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium dark:text-white">{log.userName || log.user}</p>
                      <p className="text-xs text-slate-400">{log.userRole || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        log.action?.includes('create') || log.action?.includes('add') ? 'badge-success' :
                        log.action?.includes('delete') || log.action?.includes('remove') ? 'badge-danger' :
                        log.action?.includes('update') || log.action?.includes('edit') ? 'badge-info' :
                        'badge-gray'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hidden sm:table-cell">{log.target || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[250px] truncate hidden md:table-cell">{log.details || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </tr>
                ))}
                {activityLog.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No activity logs found</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {logPage} of {totalPages} ({logTotal} entries)
              </p>
              <div className="flex gap-1">
                <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition">
                  <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (logPage <= 3) {
                    pageNum = i + 1;
                  } else if (logPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = logPage - 2 + i;
                  }
                  return (
                    <button key={pageNum} onClick={() => setLogPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-medium transition ${logPage === pageNum ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setLogPage(p => Math.min(totalPages, p + 1))} disabled={logPage === totalPages}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition">
                  <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
