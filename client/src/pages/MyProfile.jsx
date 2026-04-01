import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, Phone, Building2, Briefcase, Calendar, Shield, Lock, UserCircle,
  Heart, Droplets, MapPin, AlertCircle, Edit2, Save, X, Camera, Clock,
  GraduationCap, Target, Star, Award, ChevronRight, TrendingUp, CheckCircle2,
  BookOpen, Zap, FileText, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- Utility helpers ---

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getMemberSince(joiningDate) {
  if (!joiningDate) return null;
  const join = new Date(joiningDate);
  const now = new Date();
  let years = now.getFullYear() - join.getFullYear();
  let months = now.getMonth() - join.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years > 0 && months > 0) return `${years}y ${months}m`;
  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}m`;
  return 'Just joined';
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

// --- Tab definitions ---

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'leave', label: 'Leave Balance', icon: Calendar },
  { id: 'security', label: 'Security', icon: Lock },
];

// --- Timeline builder ---

function buildTimelineEvents(profile, enrollments, reviews, goals, skills) {
  const events = [];

  // Joining date - always first
  if (profile?.joiningDate) {
    events.push({
      date: profile.joiningDate,
      icon: Star,
      title: 'Joined the organization',
      description: `Started as ${profile.designation || 'Employee'} in ${profile.department || 'the company'}`,
      color: 'indigo',
    });
  }

  // Onboarding completion (assume 30 days after joining if joined > 30 days ago)
  if (profile?.joiningDate && daysSince(profile.joiningDate) > 30) {
    const join = new Date(profile.joiningDate);
    const onboardDate = new Date(join);
    onboardDate.setDate(onboardDate.getDate() + 30);
    events.push({
      date: onboardDate.toISOString(),
      icon: CheckCircle2,
      title: 'Onboarding completed',
      description: 'Successfully completed the onboarding program',
      color: 'emerald',
    });
  }

  // Training enrollments (completed ones)
  if (Array.isArray(enrollments)) {
    enrollments
      .filter(e => e.status === 'completed' || e.completedAt)
      .forEach(e => {
        events.push({
          date: e.completedAt || e.updatedAt || e.enrolledAt || e.createdAt,
          icon: GraduationCap,
          title: `Completed training: ${e.program?.title || e.title || 'Training Program'}`,
          description: e.program?.description || e.description || 'Training program completed successfully',
          color: 'blue',
        });
      });
  }

  // Performance reviews
  if (Array.isArray(reviews)) {
    reviews.forEach(r => {
      events.push({
        date: r.reviewDate || r.createdAt || r.updatedAt,
        icon: FileText,
        title: `Performance review${r.period ? `: ${r.period}` : ''}`,
        description: r.overallRating
          ? `Rated ${r.overallRating}/5 ${r.feedback ? '- ' + r.feedback.slice(0, 80) : ''}`
          : r.feedback || 'Performance review completed',
        color: 'amber',
      });
    });
  }

  // Goals achieved
  if (Array.isArray(goals)) {
    goals
      .filter(g => g.status === 'completed' || g.status === 'achieved')
      .forEach(g => {
        events.push({
          date: g.completedAt || g.updatedAt || g.createdAt,
          icon: Target,
          title: `Goal achieved: ${g.title || 'Goal'}`,
          description: g.description || 'Goal successfully completed',
          color: 'purple',
        });
      });
  }

  // Skills added
  if (Array.isArray(skills)) {
    skills.forEach(s => {
      if (s.createdAt || s.addedAt) {
        events.push({
          date: s.createdAt || s.addedAt,
          icon: Zap,
          title: `Skill added: ${s.name}`,
          description: `Proficiency level: ${s.level || 'beginner'}`,
          color: 'rose',
        });
      }
    });
  }

  // Sort by date descending (newest first), but joining always at the bottom
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  return events;
}

const colorMap = {
  indigo:  { dot: 'bg-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',  text: 'text-indigo-600 dark:text-indigo-400',  icon: 'text-indigo-500' },
  emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
  blue:    { dot: 'bg-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    icon: 'text-blue-500' },
  amber:   { dot: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400',   icon: 'text-amber-500' },
  purple:  { dot: 'bg-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20',  text: 'text-purple-600 dark:text-purple-400',  icon: 'text-purple-500' },
  rose:    { dot: 'bg-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20',    text: 'text-rose-600 dark:text-rose-400',    icon: 'text-rose-500' },
};

// --- Main Component ---

export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [skills, setSkills] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [goals, setGoals] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.get('/auth/me').then(r => { setProfile(r.data); setEditForm(r.data); });
    api.get('/leaves/balance').then(r => setBalances(r.data)).catch(() => {});
    api.get('/training/my-skills').then(r => setSkills(r.data)).catch(() => {});
    api.get('/training/my-enrollments').then(r => setEnrollments(r.data)).catch(() => {});
    api.get('/performance/my-reviews').then(r => setReviews(r.data)).catch(() => {});
    api.get('/performance/my-goals').then(r => setGoals(r.data)).catch(() => {});
  }, []);

  // Derived data
  const completedEnrollments = useMemo(
    () => (Array.isArray(enrollments) ? enrollments.filter(e => e.status === 'completed' || e.completedAt) : []),
    [enrollments]
  );
  const completedGoals = useMemo(
    () => (Array.isArray(goals) ? goals.filter(g => g.status === 'completed' || g.status === 'achieved') : []),
    [goals]
  );
  const timelineEvents = useMemo(
    () => buildTimelineEvents(profile, enrollments, reviews, goals, skills),
    [profile, enrollments, reviews, goals, skills]
  );

  // --- Handlers (preserved from original) ---

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
        gender: editForm.gender,
      });
      toast.success('Profile updated!');
      setProfile({ ...profile, ...editForm });
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await api.post('/employees/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile({ ...profile, avatar: res.data.avatar });
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload photo');
    }
  };

  // --- Loading state ---

  if (!profile) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  // --- Field definitions ---

  const fields = [
    { icon: User, label: 'Full Name', value: profile.name },
    { icon: Mail, label: 'Email', value: profile.email },
    { icon: Phone, label: 'Phone', value: profile.phone },
    { icon: Building2, label: 'Department', value: profile.department },
    { icon: Briefcase, label: 'Designation', value: profile.designation },
    { icon: Calendar, label: 'Joining Date', value: formatDate(profile.joiningDate) },
    { icon: Shield, label: 'Role', value: profile.role?.toUpperCase() },
    { icon: Heart, label: 'Gender', value: profile.gender || '-' },
    { icon: Calendar, label: 'Date of Birth', value: formatDate(profile.dateOfBirth) || '-' },
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

  const memberSince = getMemberSince(profile.joiningDate);
  const totalDays = daysSince(profile.joiningDate);

  // --- Activity summary stats ---

  const summaryCards = [
    { label: 'Days Since Joining', value: totalDays, icon: Clock, color: 'indigo' },
    { label: 'Trainings Completed', value: completedEnrollments.length, icon: GraduationCap, color: 'blue' },
    { label: 'Performance Reviews', value: Array.isArray(reviews) ? reviews.length : 0, icon: TrendingUp, color: 'amber' },
    { label: 'Goals Achieved', value: completedGoals.length, icon: Target, color: 'emerald' },
  ];

  const summaryColorMap = {
    indigo:  'from-indigo-500 to-indigo-600 shadow-indigo-500/25',
    blue:    'from-blue-500 to-blue-600 shadow-blue-500/25',
    amber:   'from-amber-500 to-amber-600 shadow-amber-500/25',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
  };

  // =====================
  // RENDER
  // =====================

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ===== HERO PROFILE HEADER ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 md:p-10 shadow-xl">
        {/* Decorative shapes */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-4 right-4 opacity-[0.07]">
          <UserCircle size={180} className="text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6">
          {/* Avatar */}
          <div className="relative group shrink-0">
            {profile.avatar ? (
              <img
                src={`/uploads/${profile.avatar}`}
                alt={profile.name}
                className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-white/30 shadow-2xl ring-4 ring-white/10"
              />
            ) : (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-4xl border-4 border-white/30 shadow-2xl ring-4 ring-white/10">
                {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}
            {/* Online indicator */}
            <span className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-400 rounded-full border-[3px] border-white shadow-lg" />
            {/* Upload overlay */}
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
              <Camera size={24} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          {/* Info */}
          <div className="text-center md:text-left flex-1 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{profile.name}</h1>
            <p className="text-lg text-white/80 font-medium">{profile.designation}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-sm text-white border border-white/20">
                <Building2 size={13} /> {profile.department}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-sm text-white border border-white/20">
                <Layers size={13} /> {profile.employeeId}
              </span>
              {profile.joiningDate && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-sm text-white border border-white/20">
                  <Calendar size={13} /> Joined {formatDate(profile.joiningDate)}
                </span>
              )}
              {memberSince && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 backdrop-blur-sm text-emerald-100 border border-emerald-300/30">
                  <Award size={13} /> Member since {memberSince}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== ACTIVITY SUMMARY CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`absolute -top-3 -right-3 w-16 h-16 rounded-full bg-gradient-to-br ${summaryColorMap[card.color]} opacity-10 blur-lg`} />
            <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${summaryColorMap[card.color]} shadow-lg mb-3`}>
              <card.icon size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ===== TAB NAVIGATION ===== */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB CONTENT ===== */}

      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
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
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Gender</label>
                  <select value={editForm.gender || ''} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="input mt-1">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
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
              <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Zap size={18} className="text-indigo-500 dark:text-indigo-400" /> Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s.id} className={`px-3 py-1.5 rounded-full text-xs font-medium ${levelColor(s.level)}`}>
                    {s.name} <span className="opacity-60">· {s.level}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TIMELINE TAB --- */}
      {activeTab === 'timeline' && (
        <div className="card animate-fade-in">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-500 dark:text-indigo-400" /> Employee Journey
          </h3>

          {timelineEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <Clock size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No journey events to display yet.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-300 via-purple-300 to-pink-300 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 rounded-full" />

              <div className="space-y-1">
                {timelineEvents.map((event, i) => {
                  const colors = colorMap[event.color] || colorMap.indigo;
                  const IconComp = event.icon;
                  return (
                    <div
                      key={i}
                      className="relative flex gap-4 py-4 pl-1 animate-fade-in"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {/* Dot / Icon */}
                      <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${colors.dot} shadow-lg shrink-0 ring-4 ring-white dark:ring-gray-800`}>
                        <IconComp size={16} className="text-white" />
                      </div>

                      {/* Content card */}
                      <div className={`flex-1 rounded-xl p-4 ${colors.bg} border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow duration-200`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h4 className={`text-sm font-semibold ${colors.text}`}>{event.title}</h4>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDate(event.date)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- LEAVE BALANCE TAB --- */}
      {activeTab === 'leave' && (
        <div className="card animate-fade-in">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-indigo-500 dark:text-indigo-400" /> Leave Balance
          </h3>
          {balances.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No leave balance data available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {balances.map(b => (
                <div key={b.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-100 dark:border-gray-600/50">
                  <p className="text-xs text-gray-400 font-medium">{b.leaveType}</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {b.total - b.used}
                    <span className="text-sm text-gray-400 font-normal">/{b.total}</span>
                  </p>
                  <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${b.total > 0 ? (b.used / b.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">{b.used} used</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- SECURITY TAB --- */}
      {activeTab === 'security' && (
        <div className="card animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Lock size={18} className="text-indigo-500 dark:text-indigo-400" /> Security
            </h3>
            <button onClick={() => setShowPw(!showPw)} className="btn-secondary text-xs">
              {showPw ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {!showPw ? (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                <Shield size={20} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">Password Protected</p>
                <p className="text-xs text-gray-400">Your account is secured with a password. Click &quot;Change Password&quot; to update it.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-slide-up">
              <input type="password" placeholder="Current password" value={pw.currentPassword} onChange={e => setPw({...pw, currentPassword: e.target.value})} className="input" />
              <input type="password" placeholder="New password" value={pw.newPassword} onChange={e => setPw({...pw, newPassword: e.target.value})} className="input" />
              <input type="password" placeholder="Confirm new password" value={pw.confirm} onChange={e => setPw({...pw, confirm: e.target.value})} className="input" />
              <button onClick={handleChangePw} className="btn-primary">Update Password</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
