import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Building2, Briefcase, Calendar, Shield, Lock } from 'lucide-react';
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

  if (!profile) return null;

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
      <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
            {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.employeeId} &middot; {profile.designation}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <f.icon size={18} className="text-indigo-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{f.label}</p>
                <p className="text-sm font-medium text-gray-800">{f.value || '-'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave Balance */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Leave Balance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {balances.map(b => (
            <div key={b.id} className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-400">{b.leaveType}</p>
              <p className="text-xl font-bold text-indigo-600">{b.total - b.used}<span className="text-sm text-gray-400">/{b.total}</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Lock size={18} /> Security</h3>
          <button onClick={() => setShowPw(!showPw)} className="btn-secondary text-xs">
            {showPw ? 'Cancel' : 'Change Password'}
          </button>
        </div>
        {showPw && (
          <div className="space-y-3">
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
