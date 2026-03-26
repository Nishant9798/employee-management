import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Building2, Briefcase, Calendar, Shield, Lock, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  useEffect(() => {
    api.get('/auth/me').then(r => setProfile(r.data));
    api.get('/leaves/balance').then(r => setBalances(r.data));
  }, []);

  const handleChangePw = async () => {
    if (pw.newPassword !== pw.confirm) { toast.error('Passwords do not match'); return; }
    if (pw.newPassword.length < 6) { toast.error('Minimum 6 characters'); return; }
    try {
      await api.put('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password changed!');
      setShowPw(false);
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  if (!profile) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  const fields = [
    { icon: User, label: 'Full Name', value: profile.name },
    { icon: Mail, label: 'Email', value: profile.email },
    { icon: Phone, label: 'Phone', value: profile.phone },
    { icon: Building2, label: 'Department', value: profile.department },
    { icon: Briefcase, label: 'Designation', value: profile.designation },
    { icon: Calendar, label: 'Joining Date', value: profile.joiningDate },
    { icon: Shield, label: 'Role', value: profile.role?.toUpperCase() },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30 shadow-lg">
            {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h1>{profile.name}</h1>
            <p>{profile.employeeId} &middot; {profile.designation}</p>
          </div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <UserCircle size={100} className="text-white" />
        </div>
      </div>

      {/* Personal Info */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f, i) => (
            <div key={f.label} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                <f.icon size={18} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{f.label}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{f.value || '-'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave Balance */}
      <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Leave Balance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {balances.map(b => (
            <div key={b.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <p className="text-xs text-gray-400">{b.leaveType}</p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{b.total - b.used}<span className="text-sm text-gray-400">/{b.total}</span></p>
              <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${(b.used / b.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Lock size={18} className="text-indigo-500 dark:text-indigo-400" /> Security
          </h3>
          <button onClick={() => setShowPw(!showPw)} className="btn-secondary text-xs">
            {showPw ? 'Cancel' : 'Change Password'}
          </button>
        </div>
        {showPw && (
          <div className="space-y-3 animate-slide-up">
            <input type="password" placeholder="Current password" value={pw.currentPassword} onChange={e => setPw({...pw, currentPassword: e.target.value})} className="input" />
            <input type="password" placeholder="New password" value={pw.newPassword} onChange={e => setPw({...pw, newPassword: e.target.value})} className="input" />
            <input type="password" placeholder="Confirm new password" value={pw.confirm} onChange={e => setPw({...pw, confirm: e.target.value})} className="input" />
            <button onClick={handleChangePw} className="btn-primary">Update Password</button>
          </div>
        )}
      </div>
    </div>
  );
}
