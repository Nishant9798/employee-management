import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Building2, Briefcase, Calendar, Shield, Lock, UserCircle, Heart, Droplets, MapPin, AlertCircle, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    api.get('/auth/me').then(r => { setProfile(r.data); setEditForm(r.data); });
    api.get('/leaves/balance').then(r => setBalances(r.data));
    api.get('/training/my-skills').then(r => setSkills(r.data)).catch(() => {});
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

  const handleSaveProfile = async () => {
    try {
      await api.put('/employees/profile/self', {
        phone: editForm.phone,
        address: editForm.address,
        emergencyContactName: editForm.emergencyContactName,
        emergencyContactPhone: editForm.emergencyContactPhone,
        dateOfBirth: editForm.dateOfBirth,
        bloodGroup: editForm.bloodGroup,
      });
      toast.success('Profile updated!');
      setProfile({ ...profile, ...editForm });
      setEditing(false);
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
    { icon: Heart, label: 'Gender', value: profile.gender || '-' },
    { icon: Calendar, label: 'Date of Birth', value: profile.dateOfBirth || '-' },
    { icon: Droplets, label: 'Blood Group', value: profile.bloodGroup || '-' },
    { icon: MapPin, label: 'Address', value: profile.address || '-' },
    { icon: AlertCircle, label: 'Emergency Contact', value: profile.emergencyContactName ? `${profile.emergencyContactName} (${profile.emergencyContactPhone})` : '-' },
  ];

  const levelColor = (level) => {
    switch (level) {
      case 'expert': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'advanced': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'intermediate': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-white">Personal Information</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary text-xs flex items-center gap-1">
              <Edit2 size={14} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-secondary text-xs flex items-center gap-1">
                <X size={14} /> Cancel
              </button>
              <button onClick={handleSaveProfile} className="btn-primary text-xs flex items-center gap-1">
                <Save size={14} /> Save
              </button>
            </div>
          )}
        </div>

        {!editing ? (
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Phone</label>
              <input value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="input mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date of Birth</label>
              <input type="date" value={editForm.dateOfBirth || ''} onChange={e => setEditForm({...editForm, dateOfBirth: e.target.value})} className="input mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Blood Group</label>
              <select value={editForm.bloodGroup || ''} onChange={e => setEditForm({...editForm, bloodGroup: e.target.value})} className="input mt-1">
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Address</label>
              <textarea value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} className="input mt-1" rows={2} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Emergency Contact Name</label>
              <input value={editForm.emergencyContactName || ''} onChange={e => setEditForm({...editForm, emergencyContactName: e.target.value})} className="input mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Emergency Contact Phone</label>
              <input value={editForm.emergencyContactPhone || ''} onChange={e => setEditForm({...editForm, emergencyContactPhone: e.target.value})} className="input mt-1" />
            </div>
          </div>
        )}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="card animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map(s => (
              <span key={s.id} className={`px-3 py-1.5 rounded-full text-xs font-medium ${levelColor(s.level)}`}>
                {s.name} <span className="opacity-60">· {s.level}</span>
              </span>
            ))}
          </div>
        </div>
      )}

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
